const puppeteer = require('puppeteer');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clampScore(value) {
  return Math.max(0, Math.min(Number(value) || 0, 100));
}

function getProfileLabel(score) {
  if (score === null || score === undefined) return 'Оцінку ще не сформовано';
  if (score >= 85) return 'Сильний профіль';
  if (score >= 70) return 'Хороший профіль';
  if (score >= 55) return 'Помірний профіль';
  return 'Потребує доопрацювання';
}

function getAnalysisModeLabel(analysisMode) {
  switch (analysisMode) {
    case 'full':
      return 'Full market analysis';
    case 'degraded_market':
      return 'Partial market analysis';
    case 'no_market_profile':
      return 'Resume-only analysis';
    default:
      return 'Analysis mode unavailable';
  }
}

function getMetricExplanation(metric, value) {
  const score = value ?? 0;

  if (metric === 'coverage') {
    if (score >= 80) return 'Профіль добре покриває обов’язкові ринкові вимоги.';
    if (score >= 55) return 'Покриття вимог виглядає помірним, без повної відповідності.';
    return 'Покриття ключових ринкових вимог поки слабке.';
  }

  if (metric === 'structure') {
    if (score >= 80) return 'Структура резюме виглядає цілісною та професійною.';
    if (score >= 60) return 'Структура загалом читається добре, але без сильного запасу.';
    return 'Структура документа виглядає слабкою або нестабільною.';
  }

  if (metric === 'ats') {
    if (score >= 80) return 'Резюме добре придатне до автоматичного парсингу.';
    if (score >= 60) return 'ATS-сумісність базово нормальна, але не ідеальна.';
    return 'Є помітні ризики для ATS-читабельності.';
  }

  if (score >= 80) return 'Формулювання виглядають сильними та переконливими.';
  if (score >= 60) return 'Текст читається нормально, але без виразної сили.';
  return 'Текстові формулювання послаблюють сприйняття профілю.';
}

function buildVerdict(summary) {
  const { overallScore, resumeQualityScore, marketFitScore } = summary;

  if (overallScore === null || overallScore === undefined) {
    return 'Підсумкова оцінка недоступна для цього аналізу.';
  }

  if ((resumeQualityScore ?? 0) >= 75 && (marketFitScore ?? 0) >= 75) {
    return 'Сильний профіль із хорошою якістю резюме та впевненою ринковою відповідністю.';
  }

  if ((resumeQualityScore ?? 0) >= 75 && (marketFitScore ?? 0) < 75) {
    return 'Резюме виглядає добре зібраним, але ринкова відповідність поки слабша за якість подачі.';
  }

  if ((resumeQualityScore ?? 0) < 75 && (marketFitScore ?? 0) >= 75) {
    return 'Профіль має хороший ринковий потенціал, але саме резюме подає його слабше, ніж могло б.';
  }

  if (overallScore >= 70) {
    return 'Базово хороший профіль, але ще без впевненої переваги відносно ринку.';
  }

  return 'Поточний профіль читається помірно і поки не виглядає достатньо сильним для конкурентного ринку.';
}

function buildSummaryParagraph(summary) {
  const {
    position,
    overallScore,
    resumeQualityScore,
    marketFitScore,
    matchedRequiredCount,
    requiredCount,
  } = summary;

  const sentenceOne = `Резюме оцінено для ${position || 'цільової ролі'}: загальний результат становить ${overallScore ?? '—'}/100 і зараз читається як "${getProfileLabel(overallScore)}".`;

  const sentenceTwo =
    marketFitScore !== null && marketFitScore !== undefined && requiredCount > 0
      ? `Якість самого документа становить ${resumeQualityScore ?? '—'}/100, а ринкова відповідність дорівнює ${marketFitScore}/100 при покритті ${matchedRequiredCount} з ${requiredCount} обов’язкових вимог.`
      : 'У цьому звіті головний акцент зміщений на якість самого резюме, оскільки ринковий профіль був зібраний не повністю.';

  const sentenceThree =
    (resumeQualityScore ?? 0) >= (marketFitScore ?? 0)
      ? 'Структура і подача наразі виглядають сильніше, ніж відповідність ринку, тому профіль сприймається краще на рівні документа, ніж на рівні конкурентності проти вакансій.'
      : 'Ринковий потенціал профілю вищий за якість його подачі, тому саме оформлення й презентація резюме стримують загальний результат.';

  return [sentenceOne, sentenceTwo, sentenceThree].join(' ');
}

function buildHtml(summary) {
  const exportDate = new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const verdict = buildVerdict(summary);
  const summaryParagraph = buildSummaryParagraph(summary);

  return `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Resumatch Summary</title>
    <style>
      :root {
        color-scheme: dark;
        --bg-dark: #0f1115;
        --bg-card: rgb(8, 12, 16);
        --text-main: #e5e7eb;
        --text-muted: #bcbcbc;
        --text-dim: #8b95a5;
        --color-blue: #3b82f6;
        --line: rgba(255, 255, 255, 0.08);
        --line-blue: rgba(59, 130, 246, 0.18);
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: var(--bg-dark);
        color: var(--text-main);
        font-family: Inter, Arial, sans-serif;
        width: 210mm;
        min-height: 297mm;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        width: 100%;
        min-height: 297mm;
        background:
          radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 24%),
          radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.08), transparent 22%),
          var(--bg-dark);
        padding: 18mm 16mm;
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-start;
        margin-bottom: 14px;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--line-blue);
        background: rgba(59, 130, 246, 0.08);
        color: #bfdbfe;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1, h2, p { margin: 0; }
      h1 {
        margin-top: 12px;
        font-size: 30px;
        line-height: 1.02;
        letter-spacing: -0.04em;
      }
      .role {
        margin-top: 8px;
        color: #dbeafe;
        font-size: 15px;
        font-weight: 600;
      }
      .date-box {
        min-width: 180px;
        padding: 12px 14px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.03);
      }
      .mini-label {
        display: block;
        margin-bottom: 5px;
        color: var(--text-dim);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .date-value {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-main);
      }
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 14px;
      }
      .metric-card {
        padding: 14px 15px;
        border-radius: 22px;
        border: 1px solid var(--line);
        background: var(--bg-card);
      }
      .metric-card.featured {
        border-color: var(--line-blue);
        background: linear-gradient(180deg, rgba(59,130,246,0.14), rgba(59,130,246,0.04));
      }
      .metric-label {
        display: block;
        color: var(--text-dim);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .metric-value {
        display: block;
        margin-top: 12px;
        font-size: 42px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.05em;
      }
      .metric-note {
        display: block;
        margin-top: 8px;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.45;
      }
      .verdict {
        padding: 14px 16px;
        border-radius: 20px;
        border: 1px solid var(--line-blue);
        background: rgba(59, 130, 246, 0.08);
        color: #eaf2ff;
        font-size: 14px;
        line-height: 1.55;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .summary-card,
      .metrics-detail-card {
        padding: 16px;
        border-radius: 22px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.025);
      }
      .summary-card {
        margin-bottom: 12px;
      }
      .section-title {
        font-size: 16px;
        letter-spacing: -0.02em;
      }
      .section-copy {
        margin-top: 9px;
        color: var(--text-muted);
        font-size: 13px;
        line-height: 1.65;
      }
      .metrics-stack {
        margin-top: 12px;
        display: grid;
        gap: 12px;
      }
      .progress-card {
        padding: 12px 13px;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.03);
      }
      .progress-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 8px;
      }
      .progress-title {
        color: var(--text-main);
        font-size: 13px;
        font-weight: 600;
      }
      .progress-value {
        color: #dbeafe;
        font-size: 12px;
        font-weight: 700;
      }
      .progress-track {
        height: 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--color-blue), #60a5fa);
      }
      .progress-note {
        margin-top: 8px;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--line);
        color: var(--text-dim);
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <div class="page">
        <header class="header">
          <div>
            <span class="brand">Resumatch</span>
            <h1>Resume Analysis Summary</h1>
            <div class="role">Target role: ${escapeHtml(summary.position || 'Не визначено')}</div>
          </div>

          <div class="date-box">
            <span class="mini-label">Generated</span>
            <div class="date-value">${escapeHtml(exportDate)}</div>
          </div>
        </header>

        <section class="metric-grid">
          <article class="metric-card featured">
            <span class="metric-label">Overall Score</span>
            <span class="metric-value">${escapeHtml(summary.overallScore ?? '—')}</span>
            <span class="metric-note">${escapeHtml(getProfileLabel(summary.overallScore))}</span>
          </article>

          <article class="metric-card">
            <span class="metric-label">Resume Quality</span>
            <span class="metric-value">${escapeHtml(summary.resumeQualityScore ?? '—')}</span>
            <span class="metric-note">Оцінка структури, подачі та якості документа.</span>
          </article>

          <article class="metric-card">
            <span class="metric-label">Market Fit</span>
            <span class="metric-value">${escapeHtml(summary.marketFitScore ?? '—')}</span>
            <span class="metric-note">Відповідність профілю поточному ринковому контексту.</span>
          </article>
        </section>

        <section class="verdict">${escapeHtml(verdict)}</section>

        <section class="summary-card">
          <h2 class="section-title">Summary</h2>
          <p class="section-copy">${escapeHtml(summaryParagraph)}</p>
        </section>

        <section class="metrics-detail-card">
          <h2 class="section-title">Core Signals</h2>
          <div class="metrics-stack">
            <article class="progress-card">
              <div class="progress-head">
                <span class="progress-title">Skills Coverage</span>
                <span class="progress-value">${escapeHtml(summary.requiredCoverage ?? '—')}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${escapeHtml(clampScore(summary.requiredCoverage))}%"></div>
              </div>
              <p class="progress-note">${escapeHtml(getMetricExplanation('coverage', summary.requiredCoverage))}</p>
            </article>

            <article class="progress-card">
              <div class="progress-head">
                <span class="progress-title">Structure Score</span>
                <span class="progress-value">${escapeHtml(summary.structureScore ?? '—')}/100</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${escapeHtml(clampScore(summary.structureScore))}%"></div>
              </div>
              <p class="progress-note">${escapeHtml(getMetricExplanation('structure', summary.structureScore))}</p>
            </article>

            <article class="progress-card">
              <div class="progress-head">
                <span class="progress-title">ATS Score</span>
                <span class="progress-value">${escapeHtml(summary.atsScore ?? '—')}/100</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${escapeHtml(clampScore(summary.atsScore))}%"></div>
              </div>
              <p class="progress-note">${escapeHtml(getMetricExplanation('ats', summary.atsScore))}</p>
            </article>

            <article class="progress-card">
              <div class="progress-head">
                <span class="progress-title">Text Score</span>
                <span class="progress-value">${escapeHtml(summary.textScore ?? '—')}/100</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${escapeHtml(clampScore(summary.textScore))}%"></div>
              </div>
              <p class="progress-note">${escapeHtml(getMetricExplanation('text', summary.textScore))}</p>
            </article>
          </div>
        </section>

        <footer class="footer">
          <span>Resumatch</span>
          <span>${escapeHtml(getAnalysisModeLabel(summary.analysisMode))}</span>
          <span>${escapeHtml(exportDate)}</span>
        </footer>
    </div>
  </body>
</html>`;
}

async function generateAnalysisPdf(summary) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
    await page.setContent(buildHtml(summary), { waitUntil: 'networkidle0' });

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    });
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateAnalysisPdf,
};
