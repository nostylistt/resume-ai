const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { scrapeJobListings } = require('./jobScraper');
const { getCachedMarketData, setCachedMarketData } = require('./cacheService');

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
    console.warn('marketResearch: позиція не вказана, пропускаємо');
    return null;
  }

  // 1. ПЕРЕВІРКА КЕШУ
  const cachedData = getCachedMarketData(position);
  if (cachedData) {
    console.log(`[Market Research] ⚡ SQLITE CACHE HIT! Завантажено з БД для: "${position}"`);
    return cachedData;
  }

  console.time('[Job Scraping (All Sources)]');
  const { rawTexts, sources } = await scrapeJobListings(searchKeywords, position);
  console.timeEnd('[Job Scraping (All Sources)]');

  if (rawTexts.length === 0) {
    console.warn('[Market Research] Warning: No job listings found from sources.');
    return null;
  }

  // Combine raw texts and enforce reasonable token limits
  const combinedText = rawTexts
    .map((t, i) => `--- Vacancy ${i + 1} ---\n${t}`)
    .join('\n\n');

  // Debug logging for the LLM input
  const debugLogPath = path.join(__dirname, '..', 'market_research_debug.txt');
  fs.writeFileSync(debugLogPath, `=== LLM PROMPT (SCRAPED DATA) ===\n\n${combinedText}\n\n=================================\n\n`);

  // Normalize aggregated data using LLM
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

Return ONLY valid JSON (no markdown):
{
  "positionTitle": "normalized position title",
  "requiredSkills": {
    "technical": ["list of skills found in >50% of vacancies"],
    "tools": ["list of tools found in >50% of vacancies"]
  },
  "preferredSkills": {
    "technical": ["list of skills found in 15-50% of vacancies"],
    "tools": ["list of tools found in 15-50% of vacancies"]
  },
  "typicalExperience": "e.g. 2-4 years",
  "commonRequirements": ["English level, education, work format etc."],
  "trendingTechnologies": ["growing in demand"],
  "marketInsights": "2-3 sentences in Ukrainian about market for this position"
}`;

  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.time(`[Market Normalize LLM (attempt ${attempt})]`);

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a job market analyst. Extract and aggregate skill requirements from job listings. Be concise. Output JSON only.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      });

      console.timeEnd(`[Market Normalize LLM (attempt ${attempt})]`);

      const rawText = response.choices[0].message.content;

      // Dump raw LLM output for debugging
      fs.appendFileSync(debugLogPath, `=== LLM RAW OUTPUT ===\n\n${rawText}\n\n`);

      const parsed = extractJSON(rawText);

      if (!parsed) {
        throw new Error('Failed to parse JSON from LLM response');
      }

      const result = normalizeMarketData(parsed);
      result.sources = sources;
      
      // 2. ЗБЕРЕЖЕННЯ В КЕШ
      setCachedMarketData(position, result);

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

/**
 * Витягує JSON з тексту відповіді
 */
function extractJSON(text) {
  if (!text) return null;

  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    try { return JSON.parse(jsonBlockMatch[1].trim()); }
    catch (e) { /* fallthrough */ }
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); }
    catch (e) { /* fallthrough */ }
  }

  try { return JSON.parse(text.trim()); }
  catch (e) { return null; }
}

/**
 * Нормалізація ринкових даних
 */
function normalizeMarketData(data) {
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
    sources: [],
  };
}

module.exports = {
  fetchMarketRequirements,
};
