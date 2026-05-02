/**
 * Аналізатор тексту та HR-метрик (Без LLM).
 * Перевіряє:
 * 1. Кліше та баззворди
 * 2. Оцифровані результати (метрики)
 * 3. Слабкі фрази (відповідав за)
 * 4. Пасивний стан (was managed)
 * 5. Читабельність (довжина речень)
 * 6. Прогалини в досвіді (Career gaps > 4 місяців)
 * 7. Job Hopping (Стрибунець - середня тривалість < 12 місяців)
 */

const cliches = [
  // EN
  'team player', 'hardworking', 'hard working', 'result-oriented', 'result oriented', 'out of the box', 'think outside the box', 'synergy', 'dynamic environment', 'go-getter', 'detail-oriented', 'detail oriented', 'motivated', 'self-starter', 'passionate', 'proactive', 'fast learner', 'quick learner', 'people person', 'problem solver', 'jack of all trades', 'multitasker', 'deadline-driven', 'goal-oriented', 'strategic thinker', 'visionary', 'thought leader', 'guru', 'ninja', 'rockstar', 'wizard', 'evangelist', 'innovative', 'cutting-edge', 'best of breed', 'leverage', 'paradigm shift', 'move the needle', 'circle back', 'touch base', 'low-hanging fruit', 'bandwidth', 'deep dive', 'take ownership', 'game changer', 'disruptive', 'data-driven', 'customer-centric', 'agile mindset', 'growth mindset', 'wear many hats', 'value-add',
  // UA
  'командний гравець', 'цілеспрямований', 'орієнтований на результат', 'стресостійкий', 'комунікабельний', 'динамічне середовище', 'працьовитий', 'швидко навчаюсь', 'відповідальний', 'проактивний', 'ініціативний', 'клієнтоорієнтований', 'багатозадачний', 'гнучкий', 'результативний', 'амбітний', 'лідер за природою', 'командний дух', 'позитивне мислення', 'легко адаптуюсь', 'аналітичний склад розуму', 'творчий підхід', 'стратегічне мислення', 'розвиваюсь разом з компанією', 'відданий своїй справі', 'висока мотивація'
];

const weakPhrases = [
  // EN
  'responsible for', 'duties included', 'helped with', 'assisted in', 'was involved in', 'worked on', 'handled', 'was responsible for', 'tasked with', 'participated in', 'contributed to', 'supported', 'managed', 'oversaw', 'maintained', 'coordinated', 'facilitated', 'liaised with', 'dealt with', 'processed', 'ensured', 'monitored', 'provided support for', 'served as', 'acted as', 'performed', 'executed tasks', 'completed various tasks', 'carried out', 'in charge of', 'had experience with',
  // UA
  'відповідав за', 'займався', 'допомагав', 'брав участь', 'входило в обов\'язки', 'був відповідальним', 'виконував функції', 'забезпечував', 'здійснював', 'супроводжував', 'взаємодіяв з', 'опрацьовував', 'займав посаду', 'вирішував завдання', 'підтримував', 'брав участь у розробці', 'залучався до', 'координував роботу', 'проводив роботу з', 'виконував обов\'язки'
];

const passivePatterns = [
  // EN: was/were + past participle
  /\b(was|were|is|are|been|being)\s+[a-z]+ed\b/i,
  /\b(was|were|is|are|been|being)\s+(done|made|built|created|led|managed|developed|executed)\b/i,
  // UA: був/було/були + пасивний дієприкметник (зроблений, розроблений, виконано)
  /\b(був|було|були|була)\s+[а-яєії]+(ний|на|не|ні|тий|та|те|ті|но)\b/i
];

function analyzeText(parsedResume) {
  let score = 100;
  const feedback = [];

  const addFeedback = (type, message, penalty, section) => {
    feedback.push({ type, message, section });
    score = Math.max(0, score - penalty);
  };

  const fullText = (
    (parsedResume.summary || '') + ' ' +
    (parsedResume.experience || []).map(j => (j.description || '') + ' ' + (j.achievements || []).join(' ')).join(' ')
  ).toLowerCase();

  // ==========================================
  // 1. Cliche Scanner (Кліше)
  // ==========================================
  let foundCliches = [];
  cliches.forEach(c => {
    if (fullText.includes(c)) foundCliches.push(c);
  });
  if (foundCliches.length > 0) {
    addFeedback('warning', `Знайдено порожні кліше-слова: ${foundCliches.slice(0, 3).join(', ')}. Замініть їх на реальні приклади або цифри.`, foundCliches.length * 2, 'summary');
  }

  // ==========================================
  // 2. Metrics, Weak Phrases, Passive Voice & Readability
  // ==========================================
  let totalBullets = 0;
  let bulletsWithMetrics = 0;
  let foundWeakPhrases = [];
  let passiveCount = 0;
  let sentenceCount = 0;
  let wordCount = 0;

  if (parsedResume.experience) {
    parsedResume.experience.forEach(job => {
      const textsToCheck = [];
      if (job.description) textsToCheck.push(job.description);
      if (job.achievements) textsToCheck.push(...job.achievements);

      textsToCheck.forEach(text => {
        if (!text) return;
        totalBullets++;

        // Metrics (digits, %, $, etc)
        if (/\d+/.test(text) || /%/.test(text) || /\$|\€/.test(text)) {
          bulletsWithMetrics++;
        }

        // Weak phrases
        const lowerText = text.toLowerCase();
        weakPhrases.forEach(wp => {
          if (lowerText.includes(wp)) foundWeakPhrases.push(wp);
        });

        // Passive voice
        passivePatterns.forEach(pattern => {
          if (pattern.test(lowerText)) passiveCount++;
        });

        // Readability (Words per sentence)
        const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);
        sentenceCount += sentences.length;
        sentences.forEach(s => {
          const words = s.trim().split(/\s+/).filter(w => w.length > 1);
          wordCount += words.length;
        });
      });
    });

    if (totalBullets > 0) {
      const metricRatio = bulletsWithMetrics / totalBullets;
      if (metricRatio === 0) {
        addFeedback('critical', 'У вашому досвіді немає жодної цифри чи метрики. Додайте відсотки, бюджети або кількість людей, щоб показати результат, а не тільки процес.', 15, 'experience');
      } else if (metricRatio < 0.2) {
        addFeedback('warning', 'Замало оцифрованих результатів. Намагайтесь додавати цифри (%, $, кількість) до кожного третього пункту.', 5, 'experience');
      }
    }

    if (foundWeakPhrases.length > 0) {
      const uniqueWeak = [...new Set(foundWeakPhrases)];
      addFeedback('warning', `Використано слабкі фрази: "${uniqueWeak.slice(0, 2).join('", "')}". Замініть їх на сильні активні дієслова (напр. "Створив", "Керував", "Led").`, 5, 'experience');
    }

    if (passiveCount > 0) {
      addFeedback('warning', `Знайдено речення у пасивному стані (напр. "проєкт був зроблений"). Резюме має бути в активному стані ("зробив проєкт").`, passiveCount * 2, 'experience');
    }

    if (sentenceCount > 0) {
      const avgWords = Math.round(wordCount / sentenceCount);
      if (avgWords > 20) {
        addFeedback('warning', `Речення занадто довгі (в середньому ${avgWords} слів). Читабельність низька. Скоротіть речення до 10-15 слів.`, 10, 'readability');
      } else if (avgWords > 15) {
        addFeedback('suggestion', `Речення трохи довгуваті (в середньому ${avgWords} слів). Намагайтесь писати лаконічніше.`, 2, 'readability');
      }
    }
  }

  // ==========================================
  // 3. Career Gaps & Job Hopping
  // ==========================================
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const cleanStr = dateStr.toString().toLowerCase();
    if (cleanStr.includes('present') || cleanStr.includes('now') || cleanStr.includes('по теперішній')) return new Date();

    const parts = cleanStr.split('-');
    if (parts.length >= 2) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
    return new Date(parseInt(parts[0]), 0);
  };

  if (parsedResume.experience && parsedResume.experience.length > 0) {
    let totalMonths = 0;
    let countedJobs = 0;
    let maxGapMonths = 0;

    // Сортуємо роботи від найновішої до найстарішої для правильного пошуку дірок
    const jobs = [...parsedResume.experience].sort((a, b) => {
      const dA = parseDate(a.startDate);
      const dB = parseDate(b.startDate);
      if (!dA || !dB) return 0;
      return dB - dA;
    });

    for (let i = 0; i < jobs.length; i++) {
      const start = parseDate(jobs[i].startDate);
      const end = parseDate(jobs[i].endDate);

      if (start && end && end >= start) {
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += diffMonths;
        countedJobs++;
      }

      // Перевірка дірки (між початком цієї роботи і кінцем попередньої старої)
      if (i < jobs.length - 1) {
        const olderJobEnd = parseDate(jobs[i + 1].endDate);
        const newerJobStart = parseDate(jobs[i].startDate);

        if (olderJobEnd && newerJobStart && newerJobStart > olderJobEnd) {
          const gap = (newerJobStart.getFullYear() - olderJobEnd.getFullYear()) * 12 + (newerJobStart.getMonth() - olderJobEnd.getMonth());
          if (gap > maxGapMonths) maxGapMonths = gap;
        }
      }
    }

    if (maxGapMonths > 4) {
      addFeedback('warning', `Знайдено прогалину в кар'єрі понад ${maxGapMonths} місяців. Будьте готові пояснити її рекрутеру (або згадайте фріланс/навчання в цей час).`, 5, 'experience');
    }

    if (countedJobs >= 3) {
      const avgTenure = totalMonths / countedJobs;
      if (avgTenure > 0 && avgTenure < 12) {
        addFeedback('warning', `Середня тривалість роботи становить ${Math.round(avgTenure)} міс. Це ризик "Job Hopping". Якщо це були короткострокові контракти - вкажіть це явно!`, 10, 'experience');
      }
    }
  }

  return {
    score: Math.round(score),
    feedback
  };
}

module.exports = { analyzeText };
