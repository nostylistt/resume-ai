const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { scrapeJobListings } = require('./jobScraper');

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
    .join('\n\n')
    .substring(0, 6000);

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

  const prompt = `Analyze these ${rawTexts.length} job listings for "${position}" in Ukraine and extract aggregated market requirements.

${combinedText}

---
Return ONLY valid JSON (no markdown):
{
  "positionTitle": "normalized position title",
  "requiredSkills": {
    "technical": ["must-have tech skills from MOST listings"],
    "soft": ["must-have soft skills"],
    "tools": ["must-have tools"]
  },
  "preferredSkills": {
    "technical": ["nice-to-have tech"],
    "soft": ["nice-to-have soft"],
    "tools": ["nice-to-have tools"]
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
    soft: Array.isArray(group?.soft) ? group.soft : [],
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
