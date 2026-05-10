/**
 * Text and HR heuristics analyzer (non-LLM).
 * Focuses on writing quality signals without over-penalizing
 * coarse or ambiguous resume data.
 */

const cliches = [
  'team player', 'hardworking', 'hard working', 'result-oriented', 'result oriented',
  'out of the box', 'think outside the box', 'synergy', 'dynamic environment',
  'go-getter', 'detail-oriented', 'detail oriented', 'motivated', 'self-starter',
  'passionate', 'proactive', 'fast learner', 'quick learner', 'people person',
  'problem solver', 'jack of all trades', 'multitasker', 'deadline-driven',
  'goal-oriented', 'strategic thinker', 'visionary', 'thought leader', 'guru',
  'ninja', 'rockstar', 'wizard', 'evangelist', 'innovative', 'cutting-edge',
  'best of breed', 'leverage', 'paradigm shift', 'move the needle', 'circle back',
  'touch base', 'low-hanging fruit', 'bandwidth', 'deep dive', 'take ownership',
  'game changer', 'disruptive', 'data-driven', 'customer-centric', 'agile mindset',
  'growth mindset', 'wear many hats', 'value-add',
  'командний гравець', 'цілеспрямований', 'орієнтований на результат', 'стресостійкий',
  'комунікабельний', 'динамічне середовище', 'працьовитий', 'швидко навчаюсь',
  'відповідальний', 'проактивний', 'ініціативний', 'клієнтоорієнтований',
  'багатозадачний', 'гнучкий', 'результативний', 'амбітний', 'лідер за природою',
  'командний дух', 'позитивне мислення', 'легко адаптуюсь', 'аналітичний склад розуму',
  'творчий підхід', 'стратегічне мислення', 'розвиваюсь разом з компанією',
  'відданий своїй справі', 'висока мотивація',
];

const clichePatterns = cliches.map((item) =>
  new RegExp(`(?<![\\w\\u0400-\\u04FF])${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w\\u0400-\\u04FF])`, 'i')
);

const weakPhrases = [
  'responsible for', 'duties included', 'helped with', 'assisted in',
  'was involved in', 'worked on', 'tasked with', 'participated in',
  'was responsible for', 'had experience with', 'completed various tasks',
  'carried out', 'in charge of', 'provided support for', 'executed tasks',
  'відповідав за', 'займався', 'допомагав', 'брав участь',
  'входило в обов\'язки', 'був відповідальним', 'виконував функції',
  'залучався до', 'брав участь у розробці', 'виконував обов\'язки',
  'вирішував завдання', 'проводив роботу з',
];

const passivePatterns = [
  /\b(was|were|is|are|been|being)\s+[a-z]+ed\b/i,
  /\b(was|were|is|are|been|being)\s+(done|made|built|created|led|managed|developed|executed)\b/i,
  /\b(був|було|були|була)\s+[а-яєії]+(ний|на|не|ні|тий|та|те|ті|но)\b/i,
];

function createWordRegex(words) {
  return new RegExp(`(?<![\\w\\u0400-\\u04FF])(${words.join('|')})(?![\\w\\u0400-\\u04FF])`, 'i');
}

const actionVerbsPattern = createWordRegex([
  'spearheaded', 'led', 'architected', 'built', 'developed', 'created', 'launched',
  'designed', 'implemented', 'orchestrated', 'очолював', 'очолив', 'керував',
  'побудував', 'розробив', 'створив', 'запустив', 'спроєктував', 'запровадив', 'реалізував',
]);

const impactVerbsPattern = createWordRegex([
  'increased', 'decreased', 'reduced', 'improved', 'optimized', 'saved', 'achieved',
  'delivered', 'accelerated', 'maximized', 'grew', 'scaled', 'збільшив', 'зменшив',
  'скоротив', 'покращив', 'оптимізував', 'зберіг', 'заощадив', 'досяг', 'досягнув',
  'доставив', 'прискорив', 'максимізував', 'зріс', 'масштабував', 'підвищив',
]);

function scoreBulletStrength(text) {
  if (!text || text.trim().length === 0) return 0;

  const normalized = text.toLowerCase();
  let score = 0;
  let hasMetric = false;

  if (actionVerbsPattern.test(normalized)) score += 2;

  if (/\d+%/.test(normalized) || normalized.includes('percent')) {
    score += 2;
    hasMetric = true;
  }

  if (/[\$€£]\d+|\d+[km]\b/i.test(normalized)) {
    score += 2;
    hasMetric = true;
  }

  const hasOtherNumbers = /\b(?!(19|20)\d{2}\b)\d+\+?\b/.test(normalized);
  if (hasOtherNumbers && !hasMetric) {
    score += 1;
    hasMetric = true;
  }

  if (impactVerbsPattern.test(normalized)) {
    score += hasMetric ? 4 : 1;
  }

  if (weakPhrases.some((item) => normalized.includes(item))) {
    score = Math.min(score, 3);
  }

  return Math.min(score, 10);
}

function isYearOnlyDate(dateStr) {
  return typeof dateStr === 'string' && /^\d{4}$/.test(dateStr.trim());
}

function parseDate(dateStr) {
  if (!dateStr) return null;

  const clean = dateStr.toString().toLowerCase();
  if (clean.includes('present') || clean.includes('now') || clean.includes('по теперішній')) {
    return new Date();
  }

  const parts = clean.split('-');
  if (parts.length >= 2) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1);
  }

  return new Date(parseInt(parts[0], 10), 0);
}

function analyzeText(parsedResume) {
  let score = 100;
  const feedback = [];

  const addFeedback = (type, message, penalty, section) => {
    feedback.push({ type, message, section });
    score = Math.max(0, score - penalty);
  };

  const summaryText = parsedResume.summary || '';
  const experienceItems = Array.isArray(parsedResume.experience) ? parsedResume.experience : [];
  const educationItems = Array.isArray(parsedResume.education) ? parsedResume.education : [];

  const fullText = (
    `${summaryText} ` +
    experienceItems.map((job) => `${job.description || ''} ${(job.achievements || []).join(' ')}`).join(' ')
  ).toLowerCase();

  const foundCliches = [];
  clichePatterns.forEach((pattern, index) => {
    if (pattern.test(fullText)) foundCliches.push(cliches[index]);
  });

  if (foundCliches.length > 0) {
    addFeedback(
      'suggestion',
      `Знайдено слова-кліше: ${foundCliches.slice(0, 3).join(', ')}. Краще замінити їх на конкретні приклади або цифри.`,
      Math.min(foundCliches.length, 2),
      'summary'
    );
  }

  let totalBullets = 0;
  let totalBulletStrength = 0;
  let bulletsWithMetrics = 0;
  let passiveCount = 0;
  const foundWeak = [];
  let sentenceCount = 0;
  let wordCount = 0;

  experienceItems.forEach((job) => {
    const fragments = [];
    if (job.description) fragments.push(job.description);
    if (Array.isArray(job.achievements)) fragments.push(...job.achievements);

    fragments.forEach((fragment) => {
      if (!fragment) return;

      const normalized = fragment.toLowerCase();
      totalBullets++;
      totalBulletStrength += scoreBulletStrength(fragment);

      if (/\d+/.test(fragment) || /%/.test(fragment) || /[$€]/.test(fragment)) {
        bulletsWithMetrics++;
      }

      weakPhrases.forEach((item) => {
        if (normalized.includes(item)) foundWeak.push(item);
      });

      passivePatterns.forEach((pattern) => {
        if (pattern.test(normalized)) passiveCount++;
      });

      const sentences = fragment.split(/[.!?\n]+/).filter((item) => item.trim().length > 0);
      sentenceCount += sentences.length;
      sentences.forEach((sentence) => {
        wordCount += sentence.trim().split(/\s+/).filter((word) => word.length > 1).length;
      });
    });
  });

  if (totalBullets > 0) {
    const avgStrength = totalBulletStrength / totalBullets;

    if (avgStrength < 3.5 && totalBullets >= 2) {
      addFeedback(
        'warning',
        `Описи досвіду поки слабкуваті (вплив: ${avgStrength.toFixed(1)}/10). Краще писати у форматі: сильне дієслово + результат + метрика.`,
        bulletsWithMetrics === 0 ? 8 : 5,
        'experience'
      );
    } else if (bulletsWithMetrics === 0 && totalBullets >= 3) {
      addFeedback(
        'suggestion',
        'У досвіді мало оцифрованих результатів. Додайте відсотки, кількість задач, користувачів або швидкість виконання.',
        2,
        'experience'
      );
    }
  }

  if (foundWeak.length > 0) {
    const uniqueWeak = [...new Set(foundWeak)];
    addFeedback(
      'suggestion',
      `Порада: використано слабкі фрази ("${uniqueWeak.slice(0, 2).join('", "')}"). Замініть їх на сильні активні дієслова.`,
      0,
      'experience'
    );
  }

  if (passiveCount > 0) {
    addFeedback(
      'warning',
      'Знайдено речення у пасивному стані. Краще переписати їх у активній формі.',
      Math.min(passiveCount * 2, 6),
      'experience'
    );
  }

  if (sentenceCount > 0) {
    const avgWords = Math.round(wordCount / sentenceCount);
    if (avgWords > 20) {
      addFeedback(
        'warning',
        `Речення занадто довгі (в середньому ${avgWords} слів). Читабельність низька.`,
        8,
        'readability'
      );
    } else if (avgWords > 15) {
      addFeedback(
        'suggestion',
        `Речення трохи довгуваті (в середньому ${avgWords} слів). Намагайтесь писати лаконічніше.`,
        2,
        'readability'
      );
    }
  }

  let totalMonths = 0;
  let countedJobs = 0;
  let maxGapMonths = 0;

  const jobs = [...experienceItems].sort((a, b) => {
    const aDate = parseDate(a.startDate);
    const bDate = parseDate(b.startDate);
    if (!aDate || !bDate) return 0;
    return bDate - aDate;
  });

  for (let index = 0; index < jobs.length; index++) {
    const start = parseDate(jobs[index].startDate);
    let end = parseDate(jobs[index].endDate);

    if (!end && start) end = new Date();

    if (start && end && end >= start) {
      totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      countedJobs++;
    }

    if (index >= jobs.length - 1) continue;

    const olderEnd = parseDate(jobs[index + 1].endDate);
    const newerStart = parseDate(jobs[index].startDate);
    const hasCoarseBoundary =
      isYearOnlyDate(jobs[index].startDate) ||
      isYearOnlyDate(jobs[index + 1].endDate);

    if (!olderEnd || !newerStart || hasCoarseBoundary || newerStart <= olderEnd) {
      continue;
    }

    const gapMonths =
      (newerStart.getFullYear() - olderEnd.getFullYear()) * 12 +
      (newerStart.getMonth() - olderEnd.getMonth());

    const gapCoveredByEducation = educationItems.some((item) => {
      const eduStart = parseDate(item.startDate);
      let eduEnd = parseDate(item.endDate);
      if (!eduStart) return false;
      if (!eduEnd) eduEnd = new Date();
      return eduStart <= newerStart && eduEnd >= olderEnd;
    });

    if (!gapCoveredByEducation && gapMonths > maxGapMonths) {
      maxGapMonths = gapMonths;
    }
  }

  if (maxGapMonths > 4) {
    addFeedback(
      'warning',
      `Знайдено прогалину в кар'єрі понад ${maxGapMonths} місяців. Будьте готові коротко пояснити її в резюме або на співбесіді.`,
      4,
      'experience'
    );
  }

  if (countedJobs >= 3) {
    const avgTenure = totalMonths / countedJobs;
    if (avgTenure > 0 && avgTenure < 12) {
      addFeedback(
        'warning',
        `Середня тривалість роботи становить ${Math.round(avgTenure)} міс. Це виглядає як ризик job hopping.`,
        8,
        'experience'
      );
    }
  }

  return {
    score: Math.round(score),
    feedback,
  };
}

module.exports = { analyzeText };
