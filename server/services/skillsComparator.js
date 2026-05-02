const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

// --- Zod Schema для structured output ---

const SkillItem = z.object({
  skill: z.string().describe("назва скілу з оригінального списку"),
  category: z.enum(["technical", "tools"]),
});

const MatchedSkillItem = z.object({
  skill: z.string().describe("назва скілу з резюме (оригінальна)"),
  matchedWith: z.string().describe("назва скілу з ринку, з яким збігся"),
  category: z.enum(["technical", "tools"]),
  source: z.enum(["required", "preferred"]).describe("чи це обов'язковий чи бажаний скіл"),
});

const SkillsComparisonSchema = z.object({
  matched: z.array(MatchedSkillItem).describe("скіли з резюме, які відповідають вимогам ринку"),
  missingRequired: z.array(SkillItem).describe("обов'язкові скіли ринку, яких немає в резюме"),
  missingOptional: z.array(SkillItem).describe("бажані скіли ринку, яких немає в резюме"),
  irrelevant: z.array(SkillItem).describe("скіли з резюме, яких немає у вимогах ринку"),
});

// --- System prompt ---

const SYSTEM_PROMPT = `You are a skill-matching expert for job market analysis. Your task is to compare a candidate's resume skills against market requirements and categorize every skill into exactly one group.

RULES:
1. "matched" — resume skills that correspond to a required OR preferred market skill. Consider abbreviations (JS = JavaScript), synonyms (Postgres = PostgreSQL), and closely related technologies.
2. "missingRequired" — required market skills that are NOT covered by any resume skill.
3. "missingOptional" — preferred market skills that are NOT covered by any resume skill.
4. "irrelevant" — resume skills that do NOT match any market requirement (required or preferred).
5. Each skill must appear in EXACTLY ONE category. No duplicates.
6. Preserve original skill names from the respective source lists.
7. "React" ≠ "React Native", "Java" ≠ "JavaScript" — do NOT match different technologies.
8. If a resume skill matches both a required AND preferred skill, count it as matched with source "required".`;

/**
 * Порівнює навички з резюме з вимогами ринку через LLM.
 *
 * @param {object} resumeSkills - { technical: string[], soft: string[], tools: string[] }
 * @param {object} marketRequired - { technical: string[], soft: string[], tools: string[] }
 * @param {object} marketPreferred - { technical: string[], soft: string[], tools: string[] }
 * @returns {Promise<object>} - { matched, missingRequired, missingOptional, irrelevant, stats }
 */
async function compareSkills(resumeSkills, marketRequired, marketPreferred) {
  // Валідація вхідних даних
  if (!resumeSkills || !marketRequired) {
    return createEmptyResult();
  }

  const resumeFlat = flattenSkills(resumeSkills);
  const requiredFlat = flattenSkills(marketRequired);
  const preferredFlat = flattenSkills(marketPreferred);

  // Якщо обидва списки порожні — нема з чим порівнювати
  if (resumeFlat.length === 0 && requiredFlat.length === 0 && preferredFlat.length === 0) {
    return createEmptyResult();
  }

  // Якщо ринкових даних немає — все irrelevant
  if (requiredFlat.length === 0 && preferredFlat.length === 0) {
    return {
      matched: [],
      missingRequired: [],
      missingOptional: [],
      irrelevant: resumeFlat.map(s => ({ skill: s.skill, category: s.category })),
      stats: { matchedPercent: 0, missingPercent: 0, irrelevantPercent: 100 },
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
        response_format: zodResponseFormat(SkillsComparisonSchema, 'skills_comparison'),
      });

      console.timeEnd(`[Skills Comparison LLM (attempt ${attempt})]`);

      const parsed = response.choices[0].message.parsed;
      return normalizeResult(parsed);

    } catch (error) {
      console.error(`[Skills Comparison] LLM error (attempt ${attempt}):`, error.message);
      lastError = error;

      if (attempt === MAX_RETRIES) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('[Skills Comparison] Failed after all retries');
  throw lastError;
}

/**
 * Побудова промпту для LLM
 */
function buildPrompt(resumeSkills, marketRequired, marketPreferred) {
  const formatGroup = (group) => {
    if (!group) return 'none';
    const parts = [];
    if (group.technical?.length) parts.push(`Technical: ${group.technical.join(', ')}`);
    if (group.tools?.length) parts.push(`Tools: ${group.tools.join(', ')}`);
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

/**
 * Перетворює { technical, soft, tools } на плоский масив з категоріями
 */
function flattenSkills(skillGroup) {
  if (!skillGroup) return [];
  const result = [];
  for (const [category, skills] of Object.entries(skillGroup)) {
    if (category === 'soft') continue; // Ігноруємо софт скіли в порівнянні
    if (Array.isArray(skills)) {
      for (const skill of skills) {
        result.push({ skill, category });
      }
    }
  }
  return result;
}

/**
 * Нормалізація та обчислення статистики
 */
function normalizeResult(data) {
  const matched = Array.isArray(data.matched) ? data.matched : [];
  const missingRequired = Array.isArray(data.missingRequired) ? data.missingRequired : [];
  const missingOptional = Array.isArray(data.missingOptional) ? data.missingOptional : [];
  const irrelevant = Array.isArray(data.irrelevant) ? data.irrelevant : [];

  const total = matched.length + missingRequired.length + missingOptional.length + irrelevant.length;

  const stats = total > 0
    ? {
        matchedPercent: Math.round((matched.length / total) * 100),
        missingPercent: Math.round(((missingRequired.length + missingOptional.length) / total) * 100),
        irrelevantPercent: Math.round((irrelevant.length / total) * 100),
      }
    : { matchedPercent: 0, missingPercent: 0, irrelevantPercent: 0 };

  // Корекція, щоб сума завжди = 100%
  const sum = stats.matchedPercent + stats.missingPercent + stats.irrelevantPercent;
  if (sum !== 100 && total > 0) {
    stats.irrelevantPercent += (100 - sum);
  }

  return { matched, missingRequired, missingOptional, irrelevant, stats };
}

/**
 * Порожній результат
 */
function createEmptyResult() {
  return {
    matched: [],
    missingRequired: [],
    missingOptional: [],
    irrelevant: [],
    stats: { matchedPercent: 0, missingPercent: 0, irrelevantPercent: 0 },
  };
}

module.exports = {
  compareSkills,
};
