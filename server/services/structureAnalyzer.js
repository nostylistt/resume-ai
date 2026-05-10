/**
 * Resume structure analyzer
 * Rate resume by parameters:
 * 1. Section presence
 * 2. Data completeness in sections
 * 3. Chronological order
 * 4. Text volume and readability (Chunking)
 */

function analyzeStructure(parsedResume, rawText = '') {
  let score = 100;
  const feedback = [];

  // ATS COMPATIBILITY CHECKS
  let atsScore = 100;
  const atsIssues = [];

  const addATSFeedback = (message, penalty) => {
    atsIssues.push(message);
    atsScore = Math.max(0, atsScore - penalty);
  };

  // 1. Tables & Columns check (from raw text)
  if (rawText) {
    const lines = rawText.split('\n');
    let excessiveSpacesFound = 0;

    lines.forEach(line => {
      if (/\s{5,}|\t/.test(line.trim())) excessiveSpacesFound++;
    });

    if (excessiveSpacesFound > 5) {
      addATSFeedback('Виявлено багатоколоночну верстку або таблиці. Більшість ATS-систем не можуть коректно прочитати текст з колонок, що призводить до втрати даних.', 20);
    }
  }

  // 2. Contact Parsing (Format check)
  if (parsedResume.contact) {
    const { email, phone } = parsedResume.contact;
    if (!email || !/@.+\..+/.test(email)) {
      addATSFeedback('Email відсутній або має некоректний формат.', 15);
    }
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      addATSFeedback('Телефон відсутній або має нестандартний формат. Бажано використовувати міжнародний формат (+380...).', 10);
    }
  } else {
    addATSFeedback('Блок контактів не розпізнано.', 30);
  }

  // 3. Date Formatting Consistency
  let dateIssuesCount = 0;
  const checkDateString = (dateStr) => {
    if (!dateStr) return;
    const s = dateStr.toString().toLowerCase();
    if (s.includes('present') || s.includes('now') || s.includes('дотепер') || s.includes('по теперішній')) return;
    // Look for at least a 4-digit year
    if (!/\d{4}/.test(s)) dateIssuesCount++;
  };

  if (parsedResume.experience) {
    parsedResume.experience.forEach(job => {
      checkDateString(job.startDate);
      checkDateString(job.endDate);
    });
  }
  if (parsedResume.education) {
    parsedResume.education.forEach(edu => {
      checkDateString(edu.startDate);
      checkDateString(edu.endDate);
    });
  }

  if (dateIssuesCount > 0) {
    addATSFeedback(`Знайдено нестандартний формат дат (${dateIssuesCount} шт.). Використовуйте стандартний формат "MM/YYYY" або "Місяць Рік", щоб ATS зміг автоматично вирахувати ваш стаж.`, 15);
  }

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const cleanStr = dateStr.toString().toLowerCase();
    if (cleanStr.includes('present') || cleanStr.includes('now') || cleanStr.includes('по теперішній')) return new Date();

    const parts = cleanStr.split('-');
    if (parts.length >= 2) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
    }
    return new Date(parseInt(parts[0]), 0);
  };

  const detectSeniority = (resume) => {
    if (!resume.experience || resume.experience.length === 0) return 'junior';

    let totalMonths = 0;
    let validJobs = 0;

    resume.experience.forEach(job => {
      const start = parseDate(job.startDate);
      let end = parseDate(job.endDate);

      if (!end && start) end = new Date();

      if (start && end && end >= start) {
        totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        validJobs++;
      }
    });

    if (validJobs === 0) return 'unknown';

    const totalYears = totalMonths / 12;
    if (totalYears < 2) return 'junior';
    if (totalYears < 5) return 'mid';
    return 'senior';
  };

  const seniority = detectSeniority(parsedResume);
  const weights = {
    junior: { education: 1.5, experience: 0.7, summary: 1.0, contact: 1.0, skills: 1.0 },
    mid: { education: 1.0, experience: 1.0, summary: 1.0, contact: 1.0, skills: 1.0 },
    senior: { education: 0.6, experience: 1.2, summary: 1.0, contact: 1.0, skills: 1.0 },
    unknown: { education: 1.0, experience: 1.0, summary: 1.0, contact: 1.0, skills: 1.0 },
  };

  const addFeedback = (type, message, basePenalty, section) => {
    const multiplier = weights[seniority][section] || 1.0;
    const finalPenalty = Math.round(basePenalty * multiplier);
    feedback.push({ type, message, section });
    score = Math.max(0, score - finalPenalty);
  };

  // 1. SECTION PRESENCE

  if (!parsedResume.contact || (!parsedResume.contact.email && !parsedResume.contact.phone)) {
    addFeedback('critical', 'Відсутні базові контакти (Email або Телефон). ATS може відхилити резюме.', 20, 'contact');
  }

  if (!parsedResume.experience || parsedResume.experience.length === 0) {
    addFeedback('critical', 'Секція "Досвід роботи" відсутня або порожня.', 20, 'experience');
  }

  const hasSkills = parsedResume.skills &&
    ((parsedResume.skills.technical && parsedResume.skills.technical.length > 0) ||
      (parsedResume.skills.tools && parsedResume.skills.tools.length > 0));

  if (!hasSkills) {
    addFeedback('critical', 'Секція "Навички" відсутня. Це критично для проходження ATS-систем.', 15, 'skills');
  }

  if (!parsedResume.education || parsedResume.education.length === 0) {
    addFeedback('warning', 'Секція "Освіта" відсутня.', 10, 'education');
  }

  if (!parsedResume.summary || parsedResume.summary.trim().length === 0) {
    addFeedback('warning', 'Секція "Про себе" (Summary) відсутня. Вона допомагає швидко зрозуміти ваш профіль.', 5, 'summary');
  }

  // 2. INFORMATION HIERARCHY

  if (parsedResume.experience) {
    parsedResume.experience.forEach((job, index) => {
      const jobName = job.company || `Місце роботи #${index + 1}`;
      if (!job.company || !job.position) {
        addFeedback('warning', `${jobName}: відсутня назва компанії або посада.`, 5, 'experience');
      }
      if (!job.startDate) {
        addFeedback('warning', `${jobName}: відсутня дата початку роботи.`, 5, 'experience');
      }
    });
  }

  if (parsedResume.education) {
    parsedResume.education.forEach((edu, index) => {
      const eduName = edu.institution || `Заклад #${index + 1}`;
      if (!edu.institution) {
        addFeedback('warning', `${eduName}: відсутня назва навчального закладу.`, 5, 'education');
      }
      if (!edu.degree) {
        addFeedback('suggestion', `${eduName}: не вказано ступінь (Бакалавр, Магістр тощо).`, 2, 'education');
      }
    });
  }

  // 3. REVERSE CHRONOLOGY

  if (parsedResume.experience && parsedResume.experience.length > 1) {
    let isReverseChronological = true;
    for (let i = 0; i < parsedResume.experience.length - 1; i++) {
      const dateA = parseDate(parsedResume.experience[i].startDate);
      const dateB = parseDate(parsedResume.experience[i + 1].startDate);

      // dateA (newer job) should be >= dateB (older job)
      if (dateA && dateB && dateA < dateB) {
        isReverseChronological = false;
        break;
      }
    }
    if (!isReverseChronological) {
      addFeedback('critical', 'Досвід роботи вказано не у зворотному хронологічному порядку. Найновіша робота має бути першою.', 15, 'experience');
    }
  }

  // 4. VOLUME & CHUNKING

  if (parsedResume.summary) {
    const len = parsedResume.summary.length;
    if (len < 100) {
      addFeedback('suggestion', 'Summary занадто коротке. Оптимальний розмір 150-400 символів (3-4 речення).', 2, 'summary');
    } else if (len > 500) {
      addFeedback('warning', 'Summary занадто довге (більше 500 символів). Рекрутери рідко читають такі великі абзаци.', 5, 'summary');
    }
  }

  if (parsedResume.experience) {
    parsedResume.experience.forEach((job) => {
      const jobName = job.company || 'Місце роботи';

      // "Wall of text" check
      if (job.description && job.description.length > 400) {
        addFeedback('warning', `${jobName}: Опис обов'язків формує "стіну тексту" (${job.description.length} симв.). Розбийте його на короткі bullet points.`, 5, 'experience');
      }
      if (job.achievements && Array.isArray(job.achievements)) {
        const bulletCount = job.achievements.length;

        if (bulletCount > 6) {
          addFeedback('warning', `${jobName}: Забагато маркованих пунктів (${bulletCount}). Оптимально залишати 3-5 найважливіших, щоб зберегти фокус.`, 4, 'experience');
        }

        job.achievements.forEach((bullet) => {
          if (bullet.length > 250) {
            addFeedback('suggestion', `${jobName}: Пункт занадто довгий. Розбийте його або скоротіть для кращої читабельності.`, 2, 'experience');
          }
        });
      }
    });
  }

  return {
    score: Math.round(score),
    feedback,
    atsScore: Math.round(atsScore),
    atsIssues
  };
}

module.exports = { analyzeStructure };
