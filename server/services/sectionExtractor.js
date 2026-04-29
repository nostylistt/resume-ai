const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

const ResumeSchema = z.object({
  position: z.string().nullable().describe("бажана посада, якщо зазначено"),
  contact: z.object({
    fullName: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    linkedin: z.string().nullable(),
    github: z.string().nullable(),
    website: z.string().nullable(),
    telegram: z.string().nullable(),
  }),
  summary: z.string().nullable().describe("короткий опис кандидата (секція 'Про себе' / 'Summary')"),
  experience: z.array(z.object({
    company: z.string(),
    position: z.string(),
    startDate: z.string().nullable().describe("формат: 'YYYY-MM' або 'YYYY'"),
    endDate: z.string().nullable().describe("null якщо поточна позиція"),
    current: z.boolean(),
    location: z.string().nullable(),
    description: z.string().nullable().describe("загальний опис ролі"),
    achievements: z.array(z.string()).describe("конкретні досягнення та результати")
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string().nullable().describe("бакалавр, магістр, PhD тощо"),
    field: z.string().nullable().describe("спеціальність"),
    startDate: z.string().nullable().describe("формат: 'YYYY-MM' або 'YYYY'"),
    endDate: z.string().nullable().describe("формат: 'YYYY-MM' або 'YYYY'"),
    description: z.string().nullable()
  })),
  skills: z.object({
    technical: z.array(z.string()).describe("мови програмування, фреймворки, бази даних тощо"),
    soft: z.array(z.string()).describe("комунікація, лідерство тощо"),
    tools: z.array(z.string()).describe("Git, Jira, Figma тощо")
  }),
  languages: z.array(z.object({
    language: z.string(),
    level: z.string().describe("Native/Fluent/Advanced/Intermediate/Basic або A1-C2")
  })),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().nullable(),
    date: z.string().nullable().describe("формат: 'YYYY-MM' або 'YYYY'"),
    url: z.string().nullable()
  })),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    technologies: z.array(z.string()),
    url: z.string().nullable()
  })),
  searchKeywords: z.array(z.string()).describe("3-5 search keywords in English for job search by this position, e.g. ['frontend', 'front-end developer', 'react developer']"),
  interests: z.array(z.string()),
  references: z.array(z.object({
    name: z.string(),
    position: z.string().nullable(),
    contact: z.string().nullable()
  }))
});

// Системний промпт
const SYSTEM_PROMPT = `You are a resume data extraction expert. Extract structured data from resume text.

RULES:
1. Missing sections = null or [].
2. Split skills into technical, soft, tools.
3. Dates → "YYYY-MM" or "YYYY". Unknown dates → null. Current job → endDate=null, current=true.
4. Do NOT invent data not present in the text.
5. Do NOT truncate or modify text from the resume. Data accuracy is critical.`;

/**
 * Витягує структуровані дані з сирого тексту резюме через OpenAI API (Structured Outputs).
 *
 * @param {string} rawText — сирий текст з pdf / mammoth
 * @returns {Promise<Object>} — структуровані дані резюме
 */
async function extractSections(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return createEmptyResult();
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY не знайдено в .env');
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey });
  const prompt = `Extract all data from the following resume text:\n\nResume text:\n---\n${rawText}\n---`;
  const MAX_RETRIES = 10;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.time(`[Resume Extraction LLM (attempt ${attempt})]`);

      const response = await openai.chat.completions.parse({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        response_format: zodResponseFormat(ResumeSchema, 'resume')
      });

      console.timeEnd(`[Resume Extraction LLM (attempt ${attempt})]`);

      const parsed = response.choices[0].message.parsed;
      return normalizeResult(parsed);

    } catch (error) {
      console.error(`[Resume Extraction] LLM error (attempt ${attempt}):`, error.message);
      lastError = error;

      if (attempt === MAX_RETRIES) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw lastError;
}

// Нормалізація та валідація
function normalizeResult(data) {
  return {
    position: data.position || null,
    contact: {
      fullName: data.contact?.fullName || null,
      email: data.contact?.email || null,
      phone: data.contact?.phone || null,
      location: data.contact?.location || null,
      linkedin: data.contact?.linkedin || null,
      github: data.contact?.github || null,
      website: data.contact?.website || null,
      telegram: data.contact?.telegram || null,
    },
    summary: data.summary || null,
    experience: Array.isArray(data.experience) ? data.experience.map(exp => ({
      company: exp.company || '',
      position: exp.position || '',
      startDate: exp.startDate || null,
      endDate: exp.endDate || null,
      current: Boolean(exp.current),
      location: exp.location || null,
      description: exp.description || null,
      achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
    })) : [],
    education: Array.isArray(data.education) ? data.education.map(edu => ({
      institution: edu.institution || '',
      degree: edu.degree || null,
      field: edu.field || null,
      startDate: edu.startDate || null,
      endDate: edu.endDate || null,
      description: edu.description || null,
    })) : [],
    skills: {
      technical: Array.isArray(data.skills?.technical) ? data.skills.technical : [],
      soft: Array.isArray(data.skills?.soft) ? data.skills.soft : [],
      tools: Array.isArray(data.skills?.tools) ? data.skills.tools : [],
    },
    languages: Array.isArray(data.languages) ? data.languages.map(lang => ({
      language: lang.language || '',
      level: lang.level || '',
    })) : [],
    certifications: Array.isArray(data.certifications) ? data.certifications.map(cert => ({
      name: cert.name || '',
      issuer: cert.issuer || null,
      date: cert.date || null,
      url: cert.url || null,
    })) : [],
    projects: Array.isArray(data.projects) ? data.projects.map(proj => ({
      name: proj.name || '',
      description: proj.description || null,
      technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
      url: proj.url || null,
    })) : [],
    searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
    interests: Array.isArray(data.interests) ? data.interests : [],
    references: Array.isArray(data.references) ? data.references.map(ref => ({
      name: ref.name || '',
      position: ref.position || null,
      contact: ref.contact || null,
    })) : [],
  };
}

function createEmptyResult() {
  return normalizeResult({});
}

module.exports = {
  extractSections,
};
