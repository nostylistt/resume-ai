/**
 * Аналізатор структури резюме (Алгоритмічний).
 * Оцінює резюме за 4 параметрами: 
 * 1. Наявність секцій
 * 2. Повнота даних в секціях
 * 3. Хронологічний порядок
 * 4. Обсяг тексту та читабельність (Chunking)
 * 
 * Не використовує LLM. Працює за O(N) часу.
 */

function analyzeStructure(parsedResume) {
  let score = 100;
  const feedback = [];

  const addFeedback = (type, message, penalty, section) => {
    feedback.push({ type, message, section });
    score = Math.max(0, score - penalty);
  };

  // ==========================================
  // 1. SECTION PRESENCE (Наявність розділів)
  // ==========================================
  
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

  // ==========================================
  // 2. INFORMATION HIERARCHY (Повнота даних)
  // ==========================================

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

  // ==========================================
  // 3. REVERSE CHRONOLOGY (Хронологічний порядок)
  // ==========================================
  
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

  if (parsedResume.experience && parsedResume.experience.length > 1) {
    let isReverseChronological = true;
    for (let i = 0; i < parsedResume.experience.length - 1; i++) {
      const dateA = parseDate(parsedResume.experience[i].startDate);
      const dateB = parseDate(parsedResume.experience[i+1].startDate);
      
      // dateA (newer job) should be >= dateB (older job)
      if (dateA && dateB && dateA < dateB) {
         isReverseChronological = false;
         break;
      }
    }
    if (!isReverseChronological) {
      addFeedback('critical', 'Досвід роботи вказано не у зворотному хронологічному порядку. Найновіша робота має бути першою!', 15, 'experience');
    }
  }

  // ==========================================
  // 4. VOLUME & CHUNKING (Обсяг тексту)
  // ==========================================

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
      
      // Перевірка на "стіну тексту" в описі
      if (job.description && job.description.length > 400) {
         addFeedback('warning', `${jobName}: Опис обов'язків формує "стіну тексту" (${job.description.length} симв.). Розбийте його на короткі bullet points.`, 5, 'experience');
      }

      // Перевірка кількості та розміру булітів
      if (job.achievements && Array.isArray(job.achievements)) {
        const bulletCount = job.achievements.length;
        
        if (bulletCount > 6) {
           addFeedback('warning', `${jobName}: Забагато маркованих пунктів (${bulletCount}). Оптимально залишати 3-5 найважливіших, щоб зберегти фокус.`, 4, 'experience');
        }

        job.achievements.forEach((bullet) => {
           if (bullet.length > 250) {
              addFeedback('suggestion', `${jobName}: Один з маркованих пунктів занадто довгий. Розбийте його або скоротіть для кращої читабельності.`, 2, 'experience');
           }
        });
      }
    });
  }

  return {
    score: Math.round(score),
    feedback
  };
}

module.exports = { analyzeStructure };
