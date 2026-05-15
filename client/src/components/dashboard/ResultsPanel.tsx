import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { ResumeAnalysisResult, StructureFeedbackItem } from "../../types/analysis";
import { exportAnalysisReport } from "../../lib/exportAnalysisReport";
import "../../App.css";

type TabId = "skills" | "structure" | "text";
type FeedbackType = "critical" | "warning" | "suggestion";

interface ResultsPanelProps {
  analysisResult: ResumeAnalysisResult | null;
}

const feedbackOrder: FeedbackType[] = ["critical", "warning", "suggestion"];

const getScoreLabel = (score: number | null) => {
  if (score === null) return "Немає оцінки";
  if (score >= 85) return "Сильний профіль";
  if (score >= 70) return "Хороший профіль";
  if (score >= 55) return "Помірний профіль";
  return "Потрібне доопрацювання";
};

const getAnalysisModeMeta = (analysisMode: ResumeAnalysisResult["analysisMode"]) => {
  switch (analysisMode) {
    case "full":
      return {
        title: "Повний ринковий аналіз",
        description:
          "Є достатньо даних про ринок вакансій, тому оцінку відповідності вимогам ринку можна читати напряму.",
      };
    case "degraded_market":
      return {
        title: "Неповний аналіз ринку",
        description:
          "Даних про ринок вакансій недостатньо, тому оцінка відповідності вимогам ринку є наближеною.",
      };
    case "no_market_profile":
      return {
        title: "Ринковий профіль недоступний",
        description:
          "Система не змогла побудувати ринковий профіль, тому показано лише якість самого резюме.",
      };
    default:
      return {
        title: "Режим аналізу невідомий",
        description: "Стан аналізу не вдалося інтерпретувати.",
      };
  }
};

const getFeedbackTypeLabel = (type: string) => {
  switch (type) {
    case "critical":
      return "Критично";
    case "warning":
      return "Попередження";
    case "suggestion":
      return "Порада";
    default:
      return "Інше";
  }
};

const getFeedbackClass = (type: string) => {
  if (type === "critical") return "critical";
  if (type === "warning") return "warning";
  if (type === "suggestion") return "suggestion";
  return "neutral";
};

const getFeedbackPriority = (type: string) => {
  const priority = feedbackOrder.indexOf(type as FeedbackType);
  return priority === -1 ? feedbackOrder.length : priority;
};

const countFeedback = (feedback: StructureFeedbackItem[] = []) => {
  return feedback.reduce<Record<FeedbackType, number>>(
    (counts, item) => {
      if (feedbackOrder.includes(item.type as FeedbackType)) {
        counts[item.type as FeedbackType] += 1;
      }

      return counts;
    },
    { critical: 0, warning: 0, suggestion: 0 }
  );
};

const percent = (value: number | undefined) => `${value ?? 0}%`;
const clampScore = (value: number | null | undefined) => Math.max(0, Math.min(value ?? 0, 100));

export const ResultsPanel = ({
  analysisResult,
}: ResultsPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("skills");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const sectionPresence = useMemo(() => {
    const parsedResume = analysisResult?.parsedResume;

    if (!parsedResume) {
      return [];
    }

    return [
      { name: "Контакти", present: Boolean(parsedResume.contact) },
      { name: "Summary", present: Boolean(parsedResume.summary) },
      { name: "Досвід", present: Boolean(parsedResume.experience?.length) },
      { name: "Освіта", present: Boolean(parsedResume.education?.length) },
      {
        name: "Навички",
        present:
          Boolean(parsedResume.skills?.technical?.length) ||
          Boolean(parsedResume.skills?.tools?.length),
      },
      { name: "Мови", present: Boolean(parsedResume.languages?.length) },
      { name: "Проєкти", present: Boolean(parsedResume.projects?.length) },
      {
        name: "Сертифікації",
        present: Boolean(parsedResume.certifications?.length),
      },
    ];
  }, [analysisResult]);

  if (!analysisResult) {
    return (
      <div className="dashboard-panel scrollable-panel custom-scrollbar">
        <h2 className="panel-title">
          Результати аналізу
        </h2>

        <div className="analysis-empty-state">
          <div className="empty-state-kicker">Почніть з резюме</div>
          <h3 className="empty-state-title">Завантажте файл для повного аналізу</h3>
          <p className="empty-state-desc">
            Після запуску тут з'являться загальна оцінка, відповідність ринку,
            структура, ATS-перевірка та якість тексту.
          </p>

          <div className="empty-preview-grid">
            <div className="empty-preview-card">
              <span className="empty-preview-label">Market Fit</span>
              <p>Порівняння навичок з актуальними вимогами ринку.</p>
            </div>
            <div className="empty-preview-card">
              <span className="empty-preview-label">Resume Quality</span>
              <p>Окрема оцінка структури та текстової якості резюме.</p>
            </div>
            <div className="empty-preview-card">
              <span className="empty-preview-label">Structure & ATS</span>
              <p>Перевірка секцій, читабельності та придатності до парсингу.</p>
            </div>
            <div className="empty-preview-card">
              <span className="empty-preview-label">Text Analysis</span>
              <p>Пошук слабких формулювань, кліше та HR-ризиків.</p>
            </div>
          </div>

          <div className="empty-state-note">
            Оберіть PDF або DOCX у лівій панелі, щоб запустити аналіз.
          </div>
        </div>
      </div>
    );
  }

  const overallScore = analysisResult.overallScore;
  const resumeQualityScore = analysisResult.resumeQualityScore;
  const marketFitScore =
    analysisResult.skillsComparison?.stats.marketFitScore ?? null;
  const stats = analysisResult.skillsComparison?.stats;
  const gaugeValue = clampScore(overallScore);
  const analysisModeMeta = getAnalysisModeMeta(analysisResult.analysisMode);
  const structureScore = analysisResult.structureAnalysis?.score ?? null;
  const atsScore = analysisResult.structureAnalysis?.atsScore ?? null;
  const textScore = analysisResult.textAnalysis?.score ?? null;
  const structureFeedback = [
    ...(analysisResult.structureAnalysis?.feedback || []),
  ].sort(
    (first, second) =>
      getFeedbackPriority(first.type) - getFeedbackPriority(second.type)
  );
  const structureFeedbackCounts = countFeedback(structureFeedback);
  const textFeedback = [...(analysisResult.textAnalysis?.feedback || [])].sort(
    (first, second) =>
      getFeedbackPriority(first.type) - getFeedbackPriority(second.type)
  );
  const textFeedbackCounts = countFeedback(textFeedback);

  return (
    <div className="dashboard-panel scrollable-panel custom-scrollbar">
      <div className="results-header">
        <h2 className="panel-title">
          Результати аналізу
        </h2>
        <button
          type="button"
          className="results-export-button"
          onClick={async () => {
            setIsExportingPdf(true);

            try {
              await exportAnalysisReport(analysisResult);
            } catch (error) {
              window.alert(
                error instanceof Error ? error.message : "Не вдалося згенерувати PDF."
              );
            } finally {
              setIsExportingPdf(false);
            }
          }}
          disabled={isExportingPdf}
        >
          <Download size={15} />
          {isExportingPdf ? "Генеруємо PDF..." : "Експорт у PDF"}
        </button>
      </div>

      <div className="gauge-container">
        <div className="gauge-circle">
          <div
            className="gauge-arc"
            style={{
              border: "none",
              transform: "none",
              background: `conic-gradient(from 0deg, var(--color-blue) ${gaugeValue * 3.6}deg, rgba(255, 255, 255, 0.06) ${gaugeValue * 3.6}deg 360deg)`,
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px))",
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)",
            }}
          />
          <div className="text-center">
            <div className="score-text">
              {overallScore ?? "—"}
              <span className="score-total">/100</span>
            </div>
            <div className="score-label">{getScoreLabel(overallScore)}</div>
          </div>
        </div>

        <p className="upload-desc" style={{ marginTop: "16px" }}>
          {analysisModeMeta.title}
        </p>
        <p className="upload-desc" style={{ marginTop: "8px", textAlign: "center" }}>
          {analysisModeMeta.description}
        </p>

        <div className="structure-criteria" style={{ marginTop: 16, width: "100%" }}>
          <div className="structure-criterion-item">
            <span className="structure-criterion-name">Якість резюме</span>
            <span className="structure-criterion-score">
              {resumeQualityScore ?? "—"}/100
            </span>
          </div>
          <div className="structure-criterion-item">
            <span className="structure-criterion-name">Відповідність ринку</span>
            <span className="structure-criterion-score">
              {marketFitScore ?? "—"}/100
            </span>
          </div>
          <div className="structure-criterion-item">
            <span className="structure-criterion-name">Цільова позиція</span>
            <span className="structure-criterion-score">
              {analysisResult.marketData?.positionTitle ||
                analysisResult.parsedResume.position ||
                "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === "skills" ? "active" : ""}`}
          onClick={() => setActiveTab("skills")}
        >
          Навички
        </button>
        <button
          className={`tab-btn ${activeTab === "structure" ? "active" : ""}`}
          onClick={() => setActiveTab("structure")}
        >
          Структура
        </button>
        <button
          className={`tab-btn ${activeTab === "text" ? "active" : ""}`}
          onClick={() => setActiveTab("text")}
        >
          Текст
        </button>
      </div>

      {activeTab === "skills" && (
        <div className="structure-section">
          <div className="structure-block">
            <h4 className="structure-block-title">Покриття ринкових навичок</h4>
            <p className="structure-block-desc">
              Основна оцінка базується на покритті required skills і додатково
              враховує preferred skills.
            </p>
            <div className="skills-match-legend">
              <span className="legend-dot legend-matched" />
              <span>Required Coverage: {percent(stats?.requiredCoverage)}</span>
              <span className="legend-dot legend-missing" />
              <span>Preferred Coverage: {percent(stats?.preferredCoverage)}</span>
              <span className="legend-dot legend-irrelevant" />
              <span>Згадуються рідше: {percent(stats?.irrelevantRate)}</span>
            </div>
            <div className="skills-progress-track skills-progress-segmented">
              {(stats?.requiredCoverage ?? 0) > 0 && (
                <div
                  className="skills-segment skills-segment-matched"
                  style={{ width: `${stats?.requiredCoverage ?? 0}%` }}
                />
              )}
              {(stats?.preferredCoverage ?? 0) > 0 && (
                <div
                  className="skills-segment skills-segment-missing"
                  style={{ width: `${stats?.preferredCoverage ?? 0}%` }}
                />
              )}
              {(stats?.irrelevantRate ?? 0) > 0 && (
                <div
                  className="skills-segment skills-segment-irrelevant"
                  style={{ width: `${stats?.irrelevantRate ?? 0}%` }}
                />
              )}
            </div>
          </div>

          <div className="structure-block">
            <h4 className="structure-block-title">Збігаються</h4>
            <p className="structure-block-desc">
              Навички з резюме, які відповідають ринку.
            </p>
            <div className="structure-sections">
              {analysisResult.skillsComparison?.matched.length ? (
                analysisResult.skillsComparison.matched.map((item, index) => (
                  <span
                    key={`${item.skill}-${item.matchedWith}-${index}`}
                    className="structure-pill present"
                  >
                    {item.skill}
                  </span>
                ))
              ) : (
                <span className="upload-desc">Немає збігів.</span>
              )}
            </div>
          </div>

          <div className="structure-block">
            <h4 className="structure-block-title">Відсутні обов'язкові</h4>
            <p className="structure-block-desc">
              Required skills, яких не вистачає в резюме.
            </p>
            <div className="structure-sections">
              {analysisResult.skillsComparison?.missingRequired.length ? (
                analysisResult.skillsComparison.missingRequired.map((item, index) => (
                  <span
                    key={`${item.skill}-${index}`}
                    className="structure-pill missing-required"
                  >
                    {item.skill}
                  </span>
                ))
              ) : (
                <span className="upload-desc">Немає критичних пропусків.</span>
              )}
            </div>
          </div>

          <div className="structure-block">
            <h4 className="structure-block-title">Відсутні бажані</h4>
            <p className="structure-block-desc">
              Бажані навички з ринкового профілю, яких поки немає в резюме.
            </p>
            <div className="structure-sections">
              {analysisResult.skillsComparison?.missingOptional.length ? (
                analysisResult.skillsComparison.missingOptional.map((item, index) => (
                  <span
                    key={`optional-${item.skill}-${index}`}
                    className="structure-pill missing-optional"
                  >
                    {item.skill}
                  </span>
                ))
              ) : (
                <span className="upload-desc">Бажані навички покриті.</span>
              )}
            </div>
          </div>

          <div className="structure-block">
            <h4 className="structure-block-title">Згадуються рідше</h4>
            <p className="structure-block-desc">
              Навички з резюме, які рідше зустрічаються в поточному ринковому профілі.
            </p>
            <div className="structure-sections">
              {analysisResult.skillsComparison?.irrelevant.length ? (
                analysisResult.skillsComparison.irrelevant.map((item, index) => (
                  <span
                    key={`less-mentioned-${item.skill}-${index}`}
                    className="structure-pill missing"
                  >
                    {item.skill}
                  </span>
                ))
              ) : (
                <span className="upload-desc">Немає таких навичок.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "structure" && (
        <div className="structure-section">
          <div className="structure-block">
            <h4 className="structure-block-title">Оцінка структури та ATS</h4>
            <p className="structure-block-desc">
              Ці метрики показують якість організації резюме та наскільки добре його може прочитати автоматичний парсер.
            </p>
            <div className="score-explain-grid">
              <div className="score-explain-card">
                <div className="score-explain-header">
                  <span className="score-explain-title">Structure Score</span>
                  <strong>{structureScore ?? "—"}/100</strong>
                </div>
                <p>
                  Оцінює наявність ключових секцій, логіку подачі, повноту даних і читабельність структури.
                </p>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${clampScore(structureScore)}%` }}
                  />
                </div>
              </div>

              <div className="score-explain-card">
                <div className="score-explain-header">
                  <span className="score-explain-title">ATS Score</span>
                  <strong>{atsScore ?? "—"}/100</strong>
                </div>
                <p>
                  Оцінює технічну придатність резюме до автоматичного парсингу: контакти, дати, форматування і проблемні layout-патерни.
                </p>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${clampScore(atsScore)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="structure-block">
            <h4 className="structure-block-title">Наявність секцій</h4>
            <p className="structure-block-desc">
              Базові блоки, які система змогла знайти у резюме після парсингу.
            </p>
            <div className="structure-sections">
              {sectionPresence.map((section) => (
                <span
                  key={section.name}
                  className={`structure-pill ${section.present ? "present" : "missing"}`}
                >
                  {section.present ? "✓" : "—"} {section.name}
                </span>
              ))}
            </div>
          </div>

          <div className="structure-block">
            <h4 className="structure-block-title">Зауваження по структурі</h4>
            <p className="structure-block-desc">
              Feedback згруповано за важливістю, щоб було зрозуміло, що виправляти першим.
            </p>
            <div className="feedback-summary">
              {feedbackOrder.map((type) => (
                <span
                  key={type}
                  className={`feedback-summary-pill ${getFeedbackClass(type)}`}
                >
                  {getFeedbackTypeLabel(type)} {structureFeedbackCounts[type]}
                </span>
              ))}
            </div>

            <div className="feedback-list">
              {structureFeedback.length ? (
                structureFeedback.map((item, index) => (
                  <div key={`${item.section}-${item.type}-${index}`} className="feedback-row">
                    <div className="feedback-row-main">
                      <span>{item.message}</span>
                      {item.section && (
                        <span className="feedback-row-section">{item.section}</span>
                      )}
                    </div>
                    <span className={`feedback-type-pill ${getFeedbackClass(item.type)}`}>
                      {getFeedbackTypeLabel(item.type)}
                    </span>
                  </div>
                ))
              ) : (
                <span className="upload-desc">
                  Критичних зауважень до структури немає.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "text" && (
        <div className="structure-section text-section">
          <div className="structure-block">
            <h4 className="structure-block-title">Оцінка тексту</h4>
            <p className="structure-block-desc">
              Ця секція показує, наскільки переконливо і конкретно описано досвід у резюме.
            </p>
            <div className="score-explain-grid">
              <div className="score-explain-card">
                <div className="score-explain-header">
                  <span className="score-explain-title">Text Score</span>
                  <strong>{textScore ?? "—"}/100</strong>
                </div>
                <p>
                  Оцінює формулювання досвіду: активні дієслова, конкретику, цифри, кліше, пасивний стан, довжину речень і потенційні HR-ризики.
                </p>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${clampScore(textScore)}%` }}
                  />
                </div>
              </div>
              <div className="score-explain-card">
                <div className="score-explain-header">
                  <span className="score-explain-title">Що враховано</span>
                </div>
                <p>
                  Алгоритм шукає слабкі фрази, шаблонні кліше, нестачу вимірюваних результатів, занадто довгі речення, кар'єрні прогалини та job hopping.
                </p>
              </div>
            </div>
          </div>

          <div className="structure-block">
            <h4 className="structure-block-title">Зауваження по тексту</h4>
            <p className="structure-block-desc">
              Поради відсортовано за важливістю, щоб було зрозуміло, що покращувати першим.
            </p>
            <div className="feedback-summary">
              {feedbackOrder.map((type) => (
                <span
                  key={type}
                  className={`feedback-summary-pill ${getFeedbackClass(type)}`}
                >
                  {getFeedbackTypeLabel(type)} {textFeedbackCounts[type]}
                </span>
              ))}
            </div>

            <div className="feedback-list">
              {textFeedback.length ? (
                textFeedback.map((item, index) => (
                  <div key={`${item.section}-${item.type}-${index}`} className="feedback-row">
                    <div className="feedback-row-main">
                      <span>{item.message}</span>
                      {item.section && (
                        <span className="feedback-row-section">{item.section}</span>
                      )}
                    </div>
                    <span className={`feedback-type-pill ${getFeedbackClass(item.type)}`}>
                      {getFeedbackTypeLabel(item.type)}
                    </span>
                  </div>
                ))
              ) : (
                <span className="upload-desc">
                  Зауважень до тексту немає.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
