const { GoogleGenAI } = require('@google/genai');

// JSON-схема

const RESUME_SCHEMA = `{
  "contact": {
    "fullName": "string | null",
    "email": "string | null",
    "phone": "string | null",
    "location": "string | null",
    "linkedin": "string | null",
    "github": "string | null",
    "website": "string | null",
    "telegram": "string | null"
  },
  "summary": "string | null — короткий опис кандидата (секція 'Про себе' / 'Summary')",
  "experience": [
    {
      "company": "string",
      "position": "string",
      "startDate": "string (формат: 'YYYY-MM' або 'YYYY')",
      "endDate": "string | null (null якщо поточна позиція)",
      "current": "boolean",
      "location": "string | null",
      "description": "string | null — загальний опис ролі",
      "achievements": ["string — конкретні досягнення та результати"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string | null (бакалавр, магістр, PhD тощо)",
      "field": "string | null (спеціальність)",
      "startDate": "string | null",
      "endDate": "string | null",
      "description": "string | null"
    }
  ],
  "skills": {
    "technical": ["string — мови програмування, фреймворки, бази даних тощо"],
    "soft": ["string — комунікація, лідерство тощо"],
    "tools": ["string — Git, Jira, Figma тощо"]
  },
  "languages": [
    {
      "language": "string",
      "level": "string (Native/Fluent/Advanced/Intermediate/Basic або A1-C2)"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string | null",
      "date": "string | null",
      "url": "string | null"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string | null",
      "technologies": ["string"],
      "url": "string | null"
    }
  ],
  "interests": ["string"],
  "references": [
    {
      "name": "string",
      "position": "string | null",
      "contact": "string | null"
    }
  ]
}
`;

// Системний промпт

const SYSTEM_PROMPT = `You are a resume data extraction expert. Extract structured data from resume text and return valid JSON.

RULES:
1. Return ONLY valid JSON matching the schema.
2. Missing sections = null or [].
3. Split skills into technical, soft, tools.
4. Dates → "YYYY-MM" or "YYYY". Unknown dates → null. Current job → endDate=null, current=true.
5. Do NOT invent data not present in the text.
6. Do NOT truncate or modify text from the resume. Data accuracy is critical.

JSON schema:
${RESUME_SCHEMA}`;

/**
 * Витягує структуровані дані з сирого тексту резюме через Gemini API.
 *
 * @param {string} rawText — сирий текст з pdf / mammoth
 * @returns {Promise<Object>} — структуровані дані резюме
 */
async function extractSections(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return createEmptyResult();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY не знайдено в .env');
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Extract all data from the following resume text into JSON.\n\nResume text:\n---\n${rawText}\n---`;

    console.time('Gemini API call');
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingBudget: 0 },  // Вимикаємо thinking для швидкості
        temperature: 0.1,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
      }
    });
    console.timeEnd('Gemini API call');

    const responseText = result.text;

    const parsed = JSON.parse(responseText);

    return normalizeResult(parsed);

  } catch (error) {
    console.error('Помилка Gemini API:', error.message);

    if (error instanceof SyntaxError) {
      console.error('Не вдалося розпарсити JSON відповідь від LLM');
    }

    throw error;
  }
}

// Нормалізація та валідація

function normalizeResult(data) {
  return {
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
