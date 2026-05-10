function validateResumeContent(parsedResume, rawText = '') {
  const wordCount = countWords(rawText);
  const skills = parsedResume?.skills || {};
  const hasDirectContact = hasContact(parsedResume?.contact);
  const hasExperience = hasItems(parsedResume?.experience);
  const hasPosition = hasText(parsedResume?.position);

  const signals = [
    hasDirectContact,
    hasExperience,
    hasItems(parsedResume?.education),
    hasItems(parsedResume?.projects),
    hasSkills(skills),
    hasPosition,
    hasText(parsedResume?.summary),
  ];

  const signalCount = signals.filter(Boolean).length;
  const hasCandidateSignal = hasDirectContact || hasExperience || hasPosition;
  const isValid = wordCount >= 50 && signalCount >= 2 && hasCandidateSignal;

  return {
    isValid,
    reason: isValid ? 'valid_resume' : 'not_resume_like',
    signals: {
      wordCount,
      signalCount,
      hasCandidateSignal,
    },
  };
}

function hasContact(contact = {}) {
  return Boolean(
    contact?.email ||
    contact?.phone ||
    contact?.linkedin ||
    contact?.github ||
    contact?.website ||
    contact?.telegram
  );
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasSkills(skills = {}) {
  return (
    countItems(skills.technical) +
    countItems(skills.tools) +
    countItems(skills.soft)
  ) >= 2;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length >= 3;
}

function countItems(value) {
  return Array.isArray(value) ? value.length : 0;
}

function countWords(text) {
  const matches = String(text || '').trim().match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.length : 0;
}

module.exports = {
  validateResumeContent,
};
