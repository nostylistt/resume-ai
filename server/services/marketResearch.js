const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { scrapeJobListings } = require('./jobScraper');
const { getCachedMarketData, setCachedMarketData } = require('./cacheService');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

const MARKET_PROFILE_CACHE_VERSION = 'ua-v1';

const SkillGroupSchema = z.object({
  technical: z.array(z.string()),
  tools: z.array(z.string())
});

const MarketDataSchema = z.object({
  positionTitle: z.string().nullable(),
  requiredSkills: SkillGroupSchema,
  preferredSkills: SkillGroupSchema,
  typicalExperience: z.string().nullable().describe('Short experience summary in Ukrainian.'),
  commonRequirements: z.array(z.string()).describe('Common hiring requirements written in Ukrainian.'),
  trendingTechnologies: z.array(z.string()).describe('Technology names only; keep original market spelling.'),
  marketInsights: z.string().nullable().describe('A concise market summary in Ukrainian.')
});

/**
 * Fetches market requirements by scraping multiple job portals and aggregating data via LLM.
 *
 * @param {string} position - Job title from the parsed resume
 * @param {string[]} searchKeywords - Relevant search queries
 * @param {object} skills - User's existing skills
 * @returns {Promise<Object|null>} - Structured market data
 */
async function fetchMarketRequirements(position, searchKeywords = [], skills = {}) {
  if (!position || typeof position !== 'string' || position.trim().length === 0) {
    console.warn('marketResearch: position is missing, skipping market profile');
    return null;
  }

  const cacheKey = `${MARKET_PROFILE_CACHE_VERSION}|${position}`;

  // 1. Cache check
  const cachedData = getCachedMarketData(cacheKey);
  if (cachedData) {
    console.log(`[Market Research] SQLITE CACHE HIT for "${position}"`);
    return cachedData;
  }

  console.time('[Job Scraping (All Sources)]');
  const { rawTexts, vacancies, sources, sourceKeys, dedupeStats } = await scrapeJobListings(searchKeywords, position);
  console.timeEnd('[Job Scraping (All Sources)]');

  if (rawTexts.length === 0) {
    console.warn('[Market Research] Warning: No job listings found from sources.');
    return null;
  }

  const combinedText = rawTexts
    .map((text, index) => `--- Vacancy ${index + 1} ---\n${text}`)
    .join('\n\n');

  const debugLogPath = path.join(__dirname, '..', 'market_research_debug.txt');
  if (process.env.NODE_ENV === 'development') {
    fs.promises
      .writeFile(
        debugLogPath,
        `=== LLM PROMPT (SCRAPED DATA) ===\n\n${combinedText}\n\n=================================\n\n`
      )
      .catch(() => {});
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Market Research] Error: OPENAI_API_KEY is not configured.');
    throw new Error('OPENAI_API_KEY is missing');
  }

  const openai = new OpenAI({ apiKey });

  const prompt = `Analyze these ${rawTexts.length} job listings for "${position}" in Ukraine and extract market requirements based on statistical frequency.

${combinedText}

---
RULES FOR SKILL EXTRACTION:
1. Count how many vacancies mention each technical skill or tool.
2. If a skill appears in >50% of vacancies, it is a "requiredSkill".
3. If a skill appears in 15% to 50% of vacancies, it is a "preferredSkill".
4. If a skill appears in <15% of vacancies, IGNORE IT entirely (it is noise).
5. DO NOT extract soft skills (like communication, teamwork).
6. Write "marketInsights", "typicalExperience", and "commonRequirements" in Ukrainian.
7. Keep skill names and technology names in their original market spelling, usually English.
8. "positionTitle" may stay in English if that is how the role appears in the market.
`;

  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.time(`[Market Normalize LLM (attempt ${attempt})]`);

      const response = await openai.chat.completions.parse({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a job market analyst. Extract and aggregate skill requirements from job listings. Be concise. All narrative output must be in Ukrainian, but skill and technology names must keep their original market spelling.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: zodResponseFormat(MarketDataSchema, 'market_data'),
      });

      console.timeEnd(`[Market Normalize LLM (attempt ${attempt})]`);

      const parsed = response.choices[0].message.parsed;

      if (process.env.NODE_ENV === 'development') {
        fs.promises
          .appendFile(debugLogPath, `=== LLM PARSED OUTPUT ===\n\n${JSON.stringify(parsed, null, 2)}\n\n`)
          .catch(() => {});
      }

      if (!parsed) {
        throw new Error('Failed to parse JSON from LLM response');
      }

      const result = normalizeMarketData(parsed, sources, rawTexts.length, dedupeStats, sourceKeys, vacancies);

      setCachedMarketData(cacheKey, result);

      return result;

    } catch (error) {
      console.error(`[Market Research] LLM Normalization error (attempt ${attempt}):`, error.message);
      lastError = error;

      if (attempt === MAX_RETRIES) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('[Market Research] Failed to normalize data after all retries.');
  return null;
}

function normalizeMarketData(data, sources = [], sampleSize = 0, dedupeStats = null, sourceKeys = [], vacancies = []) {
  const normalizeSkillGroup = (group) => ({
    technical: Array.isArray(group?.technical) ? group.technical : [],
    tools: Array.isArray(group?.tools) ? group.tools : [],
  });

  return {
    positionTitle: data.positionTitle || null,
    requiredSkills: normalizeSkillGroup(data.requiredSkills),
    preferredSkills: normalizeSkillGroup(data.preferredSkills),
    typicalExperience: data.typicalExperience || null,
    commonRequirements: Array.isArray(data.commonRequirements) ? data.commonRequirements : [],
    trendingTechnologies: Array.isArray(data.trendingTechnologies) ? data.trendingTechnologies : [],
    marketInsights: data.marketInsights || null,
    sampleSize,
    sourceCount: Array.isArray(sourceKeys) ? sourceKeys.length : 0,
    dedupeStats: dedupeStats || { duplicatesRemoved: 0, finalCount: sampleSize },
    sources: Array.isArray(sources) ? sources : [],
    vacancies: Array.isArray(vacancies)
      ? vacancies
          .filter((vacancy) => vacancy?.url && vacancy?.source)
          .map((vacancy) => ({
            source: vacancy.source,
            url: vacancy.url,
            title: vacancy.title || null,
          }))
      : [],
  };
}

module.exports = {
  fetchMarketRequirements,
};
