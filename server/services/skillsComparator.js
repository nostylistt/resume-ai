const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

// Zod schema for structured output
const SkillItem = z.object({
  skill: z.string().describe('Skill name from the original list'),
  category: z.enum(['technical', 'tools']),
});

const MatchedSkillItem = z.object({
  skill: z.string().describe('Skill name from the resume'),
  matchedWith: z.string().describe('Market skill that matches the resume skill'),
  category: z.enum(['technical', 'tools']),
  source: z
    .enum(['required', 'preferred'])
    .describe('Indicates whether the matched market skill is required or preferred'),
});

const SkillsComparisonSchema = z.object({
  matched: z
    .array(MatchedSkillItem)
    .describe('Resume skills that match market requirements'),
  missingRequired: z
    .array(SkillItem)
    .describe('Required market skills that are missing from the resume'),
  missingOptional: z
    .array(SkillItem)
    .describe('Preferred market skills that are missing from the resume'),
  irrelevant: z
    .array(SkillItem)
    .describe('Resume skills that do not match any market requirement'),
});

// System prompt
const SYSTEM_PROMPT = `You are a skill-matching expert for job market analysis. Your task is to compare a candidate's resume skills against market requirements and categorize every skill into exactly one group.
RULES:
1. "matched" - resume skills that correspond to a required OR preferred market skill. Consider abbreviations (JS = JavaScript), synonyms (Postgres = PostgreSQL), and closely related technologies.
2. "missingRequired" - required market skills that are NOT covered by any resume skill.
3. "missingOptional" - preferred market skills that are NOT covered by any resume skill.
4. "irrelevant" - resume skills that do NOT match any market requirement (required or preferred).
5. Each skill must appear in EXACTLY ONE category. No duplicates.
6. Preserve original skill names from the respective source lists.
7. "React" and "React Native" are different technologies. "Java" and "JavaScript" are also different technologies.
8. If a resume skill matches both a required AND preferred skill, count it as matched with source "required".`;

/**
 * Compares resume skills against market requirements through the LLM.
 *
 * @param {object} resumeSkills - { technical: string[], soft: string[], tools: string[] }
 * @param {object} marketRequired - { technical: string[], soft: string[], tools: string[] }
 * @param {object} marketPreferred - { technical: string[], soft: string[], tools: string[] }
 * @returns {Promise<object>} - { matched, missingRequired, missingOptional, irrelevant, stats }
 */
async function compareSkills(resumeSkills, marketRequired, marketPreferred) {
  if (!resumeSkills || !marketRequired) {
    return createEmptyResult();
  }

  const resumeFlat = flattenSkills(resumeSkills);
  const requiredFlat = flattenSkills(marketRequired);
  const preferredFlat = flattenSkills(marketPreferred);

  if (
    resumeFlat.length === 0 &&
    requiredFlat.length === 0 &&
    preferredFlat.length === 0
  ) {
    return createEmptyResult();
  }

  if (requiredFlat.length === 0 && preferredFlat.length === 0) {
    return {
      matched: [],
      missingRequired: [],
      missingOptional: [],
      irrelevant: resumeFlat.map((s) => ({
        skill: s.skill,
        category: s.category,
      })),
      stats: {
        matchedRequiredCount: 0,
        matchedPreferredCount: 0,
        requiredCount: 0,
        preferredCount: 0,
        irrelevantCount: resumeFlat.length,
        resumeSkillCount: resumeFlat.length,
        requiredCoverage: 0,
        preferredCoverage: 0,
        irrelevantRate: resumeFlat.length > 0 ? 100 : 0,
        marketFitScore: 0,
      },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[SkillsComparator] OPENAI_API_KEY not found');
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey });
  const prompt = buildPrompt(resumeSkills, marketRequired, marketPreferred);

  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.time(`[Skills Comparison LLM (attempt ${attempt})]`);

      const response = await openai.chat.completions.parse({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: zodResponseFormat(
          SkillsComparisonSchema,
          'skills_comparison'
        ),
      });

      console.timeEnd(`[Skills Comparison LLM (attempt ${attempt})]`);

      const parsed = response.choices[0].message.parsed;
      return normalizeResult(parsed);
    } catch (error) {
      console.error(
        `[Skills Comparison] LLM error (attempt ${attempt}):`,
        error.message
      );

      lastError = error;

      if (attempt === MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.error('[Skills Comparison] Failed after all retries');
  throw lastError;
}

function buildPrompt(resumeSkills, marketRequired, marketPreferred) {
  const formatGroup = (group) => {
    if (!group) return 'none';

    const parts = [];

    if (group.technical?.length) {
      parts.push(`Technical: ${group.technical.join(', ')}`);
    }

    if (group.tools?.length) {
      parts.push(`Tools: ${group.tools.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('\n  ') : 'none';
  };

  return `Compare the candidate's skills against market requirements:
RESUME SKILLS:
  ${formatGroup(resumeSkills)}
MARKET REQUIRED SKILLS:
  ${formatGroup(marketRequired)}
MARKET PREFERRED SKILLS:
  ${formatGroup(marketPreferred)}
Categorize every skill into exactly one group: matched, missingRequired, missingOptional, or irrelevant.`;
}

function flattenSkills(skillGroup) {
  if (!skillGroup) return [];

  const result = [];

  for (const [category, skills] of Object.entries(skillGroup)) {
    if (category === 'soft') continue;

    if (Array.isArray(skills)) {
      for (const skill of skills) {
        result.push({ skill, category });
      }
    }
  }

  return result;
}

function normalizeResult(data) {
  const matched = Array.isArray(data.matched) ? data.matched : [];
  const missingRequired = Array.isArray(data.missingRequired)
    ? data.missingRequired
    : [];
  const missingOptional = Array.isArray(data.missingOptional)
    ? data.missingOptional
    : [];
  const irrelevant = Array.isArray(data.irrelevant) ? data.irrelevant : [];

  const matchedRequiredCount = matched.filter(
    (item) => item.source === 'required'
  ).length;

  const matchedPreferredCount = matched.filter(
    (item) => item.source === 'preferred'
  ).length;

  const requiredCount = matchedRequiredCount + missingRequired.length;
  const preferredCount = matchedPreferredCount + missingOptional.length;
  const irrelevantCount = irrelevant.length;
  const resumeSkillCount = matched.length + irrelevantCount;

  const requiredCoverage =
    requiredCount > 0 ? matchedRequiredCount / requiredCount : 0;

  const preferredCoverage =
    preferredCount > 0 ? matchedPreferredCount / preferredCount : 0;

  const irrelevantRate =
    resumeSkillCount > 0 ? irrelevantCount / resumeSkillCount : 0;

  const marketFitRaw =
    requiredCoverage * 70 +
    preferredCoverage * 20 -
    Math.min(irrelevantRate * 10, 10);

  const stats = {
    matchedRequiredCount,
    matchedPreferredCount,
    requiredCount,
    preferredCount,
    irrelevantCount,
    resumeSkillCount,
    requiredCoverage: Math.round(requiredCoverage * 100),
    preferredCoverage: Math.round(preferredCoverage * 100),
    irrelevantRate: Math.round(irrelevantRate * 100),
    marketFitScore: Math.max(0, Math.min(100, Math.round(marketFitRaw))),
  };

  return {
    matched,
    missingRequired,
    missingOptional,
    irrelevant,
    stats,
  };
}

function createEmptyResult() {
  return {
    matched: [],
    missingRequired: [],
    missingOptional: [],
    irrelevant: [],
    stats: {
      matchedRequiredCount: 0,
      matchedPreferredCount: 0,
      requiredCount: 0,
      preferredCount: 0,
      irrelevantCount: 0,
      resumeSkillCount: 0,
      requiredCoverage: 0,
      preferredCoverage: 0,
      irrelevantRate: 0,
      marketFitScore: 0,
    },
  };
}

module.exports = {
  compareSkills,
};