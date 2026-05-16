const fs = require('fs');
const path = require('path');

const SENIORITY_DEBUG_LOG_PATH = path.join(__dirname, '..', 'seniority_debug.log');

function parseResumeDate(dateStr) {
  if (!dateStr) return null;

  const clean = String(dateStr).trim().toLowerCase();
  if (!clean) return null;

  if (
    clean.includes('present') ||
    clean.includes('current') ||
    clean.includes('now') ||
    clean.includes('до тепер') ||
    clean.includes('по тепер')
  ) {
    return new Date();
  }

  const isoLikeMatch = clean.match(/^(\d{4})(?:-(\d{1,2}))?$/);
  if (isoLikeMatch) {
    const year = Number(isoLikeMatch[1]);
    const month = isoLikeMatch[2] ? Number(isoLikeMatch[2]) - 1 : 0;
    return new Date(year, month, 1);
  }

  const yearMatch = clean.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return new Date(Number(yearMatch[0]), 0, 1);
  }

  return null;
}

function calculateExperienceYears(experience = []) {
  if (!Array.isArray(experience) || experience.length === 0) {
    return 0;
  }

  let totalMonths = 0;

  for (const job of experience) {
    const start = parseResumeDate(job?.startDate);
    const end = parseResumeDate(job?.endDate) || (start ? new Date() : null);

    if (!start || !end || end < start) {
      continue;
    }

    totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  return totalMonths / 12;
}

function collectPositionHaystacks(experience = [], position = '') {
  const haystacks = [];

  if (position) {
    haystacks.push(String(position).toLowerCase());
  }

  if (Array.isArray(experience)) {
    for (const job of experience) {
      if (job?.position) {
        haystacks.push(String(job.position).toLowerCase());
      }
    }
  }

  return haystacks;
}

function inferSeniorityFromTitles(experience = [], position = '') {
  const haystacks = collectPositionHaystacks(experience, position);
  const combined = haystacks.join(' | ');

  const matchGroups = [
    {
      seniority: 'junior',
      regex: /\b(intern|internship|trainee|junior|jr\.?)\b/,
    },
    {
      seniority: 'senior',
      regex: /\b(principal|staff|head|senior|sr\.?)\b/,
    },
    {
      seniority: 'mid',
      regex: /\b(mid-level|middle|mid\b)\b/,
    },
  ];

  for (const group of matchGroups) {
    const matchedToken = combined.match(group.regex);
    if (matchedToken) {
      return {
        seniority: group.seniority,
        reason: `matched_title_marker:${matchedToken[0]}`,
        matchedToken: matchedToken[0],
        haystacks,
      };
    }
  }

  return {
    seniority: null,
    reason: 'no_explicit_title_marker',
    matchedToken: null,
    haystacks,
  };
}

function inferSeniorityFromYears(experienceYears) {
  if (!experienceYears || experienceYears <= 0) {
    return 'junior';
  }

  if (experienceYears < 2) {
    return 'junior';
  }

  if (experienceYears < 5) {
    return 'mid';
  }

  return 'senior';
}

function shouldWriteSeniorityDebug() {
  if (process.env.SENIORITY_DEBUG === 'true') {
    return true;
  }

  if (process.env.SENIORITY_DEBUG === 'false') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

function writeSeniorityDebug(entry) {
  if (!shouldWriteSeniorityDebug()) {
    return;
  }

  try {
    fs.appendFileSync(SENIORITY_DEBUG_LOG_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.error('[Seniority Debug] Failed to write debug log:', error.message);
  }
}

function explainResumeSeniority({ position = '', experience = [] } = {}, options = {}) {
  const titleDetection = inferSeniorityFromTitles(experience, position);
  const experienceYears = calculateExperienceYears(experience);
  const fallbackSeniority = inferSeniorityFromYears(experienceYears);
  const selectedSeniority = titleDetection.seniority || fallbackSeniority;

  const explanation = {
    source: options.source || 'unknown',
    position: position || null,
    experienceYears: Number(experienceYears.toFixed(2)),
    explicitSeniority: titleDetection.seniority,
    explicitReason: titleDetection.reason,
    matchedToken: titleDetection.matchedToken,
    sampledTitles: titleDetection.haystacks.slice(0, 6),
    fallbackSeniority,
    selectedSeniority,
  };

  if (options.finalPosition !== undefined) {
    explanation.finalPosition = options.finalPosition;
  }

  if (options.log !== false) {
    writeSeniorityDebug({
      timestamp: new Date().toISOString(),
      ...explanation,
    });
  }

  return explanation;
}

function inferResumeSeniority({ position = '', experience = [] } = {}, options = {}) {
  return explainResumeSeniority({ position, experience }, { ...options, log: options.log ?? false }).selectedSeniority;
}

function positionAlreadyContainsSeniority(position = '') {
  return /\b(intern|trainee|junior|jr\.?|middle|mid-level|mid\b|senior|sr\.?|lead|principal|staff|head)\b/i.test(position);
}

function formatSeniorityLabel(seniority) {
  if (seniority === 'junior') return 'Junior';
  if (seniority === 'mid') return 'Middle';
  if (seniority === 'senior') return 'Senior';
  return null;
}

function enrichPositionWithSeniority(position, seniority) {
  if (!position || typeof position !== 'string') {
    return position || null;
  }

  const trimmedPosition = position.trim();
  if (!trimmedPosition || positionAlreadyContainsSeniority(trimmedPosition)) {
    return trimmedPosition || null;
  }

  const label = formatSeniorityLabel(seniority);
  if (!label) {
    return trimmedPosition;
  }

  return `${label} ${trimmedPosition}`;
}

module.exports = {
  calculateExperienceYears,
  explainResumeSeniority,
  inferResumeSeniority,
  enrichPositionWithSeniority,
  SENIORITY_DEBUG_LOG_PATH,
};
