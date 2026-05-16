import { useEffect, useState } from "react";
import { ExternalLink, Lightbulb, PenLine, Sparkles } from "lucide-react";
import { API_URL, authorizedFetch } from "../../lib/api";
import type {
  MarketData,
  MarketVacancy,
  ResumeAnalysisResult,
  RewriteOpportunity,
  RewriteSuggestion,
  StructureFeedbackItem,
} from "../../types/analysis";
import "../../App.css";

interface InsightsPanelProps {
  analysisResult: ResumeAnalysisResult | null;
  isAnalyzing: boolean;
}

interface WritingTip {
  id: string;
  title: string;
  section: string;
  priority: string;
  priorityClass: string;
  description: string;
  template: string;
  sourceMessage: string;
  opportunity: RewriteOpportunity | null;
}

const feedbackPriority: Record<string, number> = {
  critical: 0,
  warning: 1,
  suggestion: 2,
};

const sectionLabels: Record<string, string> = {
  summary: "Summary",
  experience: "Досвід",
  readability: "Читабельність",
};

const sourceLabels: Record<MarketVacancy["source"], string> = {
  dou: "DOU",
  workua: "Work.ua",
  robota: "Robota.ua",
};

const formatSection = (section: string) => sectionLabels[section] || section || "Текст";

const getPriorityMeta = (type: string) => {
  if (type === "critical") {
    return { label: "Критично", className: "critical" };
  }

  if (type === "warning") {
    return { label: "Важливо", className: "warning" };
  }

  return { label: "Порада", className: "suggestion" };
};

const buildFallbackMarketInsight = (marketData: MarketData | null) => {
  if (!marketData) {
    return "Ринковий контекст ще не побудовано. Завантаж резюме, щоб система порівняла профіль з актуальними вакансіями.";
  }

  const position = marketData.positionTitle || "обраної позиції";
  const experience = marketData.typicalExperience
    ? ` Типовий рівень досвіду: ${marketData.typicalExperience}.`
    : "";

  return `Система побудувала ринковий профіль для ${position}.${experience}`;
};

const getVacancyTitle = (vacancy: MarketVacancy) =>
  vacancy.title || `Vacancy from ${sourceLabels[vacancy.source] || vacancy.source}`;

const buildFallbackWritingTip = (feedback: StructureFeedbackItem): WritingTip => {
  const message = feedback.message || "";
  const normalized = message.toLowerCase();
  const section = formatSection(feedback.section);
  const priority = getPriorityMeta(feedback.type);

  if (normalized.includes("кліше")) {
    return {
      id: `feedback-${feedback.section}-cliche`,
      title: "Замінити кліше на факти",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Замість загальних характеристик краще показати конкретну дію, контекст і результат.",
      template: "Не загальна риса, а конкретна дія та фактичний результат.",
      sourceMessage: message,
      opportunity: null,
    };
  }

  if (normalized.includes("цифр") || normalized.includes("метрик") || normalized.includes("вплив")) {
    return {
      id: `feedback-${feedback.section}-metrics`,
      title: "Додати вимірюваний результат",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Сильний bullet має показувати не тільки дію, а й вимірюваний ефект для продукту або команди.",
      template: "Дія + що саме зроблено + практичний результат.",
      sourceMessage: message,
      opportunity: null,
    };
  }

  if (normalized.includes("пасив")) {
    return {
      id: `feedback-${feedback.section}-passive`,
      title: "Переписати в активній формі",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Активна форма краще показує особистий внесок кандидата і робить досвід переконливішим.",
      template: "Активне дієслово + дія + контекст + результат.",
      sourceMessage: message,
      opportunity: null,
    };
  }

  if (normalized.includes("довг") || feedback.section === "readability") {
    return {
      id: `feedback-${feedback.section}-readability`,
      title: "Скоротити довгі речення",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Довгі речення складніше швидко сканувати, тому краще розбити їх на короткі bullets.",
      template: "Одна думка = одна фраза: дія, контекст, результат.",
      sourceMessage: message,
      opportunity: null,
    };
  }

  if (normalized.includes("прогалин")) {
    return {
      id: `feedback-${feedback.section}-gap`,
      title: "Пояснити кар'єрну паузу",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Якщо є помітна пауза, її краще коротко пояснити, щоб не лишати простір для негативних припущень.",
      template: "Короткий нейтральний рядок з контекстом перерви.",
      sourceMessage: message,
      opportunity: null,
    };
  }

  return {
    id: `feedback-${feedback.section}-generic`,
    title: "Посилити опис досвіду",
    section,
    priority: priority.label,
    priorityClass: priority.className,
    description:
      "Формулювання має чітко показувати дію кандидата, контекст задачі та практичний результат.",
    template: "Сильне дієслово + задача + контекст + результат.",
    sourceMessage: message,
    opportunity: null,
  };
};

const buildWritingTips = (
  feedback: StructureFeedbackItem[] = [],
  opportunities: RewriteOpportunity[] = [],
  options: { dedupeOpportunities?: boolean } = {}
) => {
  if (opportunities.length > 0) {
    const tips: WritingTip[] = opportunities.map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      section: formatSection(opportunity.section),
      priority: getPriorityMeta(opportunity.priorityClass).label,
      priorityClass: opportunity.priorityClass,
      description: opportunity.description,
      template: opportunity.formula,
      sourceMessage: opportunity.sourceMessage,
      opportunity,
    }));

    if (!options.dedupeOpportunities) {
      return tips;
    }

    const uniqueTips = new Map<string, WritingTip>();
    tips.forEach((tip) => {
      const key = `${tip.title}__${tip.priorityClass}__${tip.section}`;
      if (!uniqueTips.has(key)) {
        uniqueTips.set(key, {
          ...tip,
          id: key,
          opportunity: null,
        });
      }
    });

    return Array.from(uniqueTips.values());
  }

  const sortedFeedback = [...feedback].sort(
    (first, second) =>
      (feedbackPriority[first.type] ?? 3) - (feedbackPriority[second.type] ?? 3)
  );

  const tips = sortedFeedback.map(buildFallbackWritingTip);
  const uniqueTips = new Map<string, WritingTip>();

  tips.forEach((tip) => {
    if (!uniqueTips.has(tip.title)) {
      uniqueTips.set(tip.title, tip);
    }
  });

  return Array.from(uniqueTips.values()).slice(0, 4);
};

export const InsightsPanel = ({
  analysisResult,
  isAnalyzing,
}: InsightsPanelProps) => {
  const [showAllVacancies, setShowAllVacancies] = useState(false);
  const [isImprovingAll, setIsImprovingAll] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [rewriteResultsById, setRewriteResultsById] = useState<Record<string, RewriteSuggestion[]>>({});

  useEffect(() => {
    setShowAllVacancies(false);
    setIsImprovingAll(false);
    setRewriteError(null);
    setRewriteResultsById({});
  }, [analysisResult]);

  if (!analysisResult && !isAnalyzing) {
    return (
      <div className="dashboard-panel scrollable-panel custom-scrollbar">
        <h2 className="panel-title">
          <Lightbulb className="text-yellow-400" size={20} />
          Інсайти
        </h2>

        <div className="insights-empty-state">
          <div className="empty-state-kicker">Після аналізу</div>
          <h3 className="empty-state-title">Тут з'являться практичні рекомендації</h3>
          <p className="empty-state-desc">
            Система підсумує ринковий контекст і покаже, як покращити текст резюме.
          </p>

          <div className="empty-preview-list">
            <div className="empty-preview-row">
              <span className="empty-preview-status" />
              <div>
                <span className="empty-preview-label">Ринковий контекст</span>
                <p>Короткий висновок по вимогах для цільової позиції.</p>
              </div>
            </div>
            <div className="empty-preview-row">
              <span className="empty-preview-status" />
              <div>
                <span className="empty-preview-label">Пріоритети покращення</span>
                <p>Що найбільше впливає на якість резюме і market fit.</p>
              </div>
            </div>
            <div className="empty-preview-row">
              <span className="empty-preview-status" />
              <div>
                <span className="empty-preview-label">Формулювання</span>
                <p>Поради щодо сильнішого опису досвіду та результатів.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const marketData = analysisResult?.marketData ?? null;
  const marketInsight =
    marketData?.marketInsights || buildFallbackMarketInsight(marketData);
  const opportunities = analysisResult?.textAnalysis?.rewriteOpportunities || [];
  const hasRewriteResults = Object.keys(rewriteResultsById).length > 0;
  const writingTips = buildWritingTips(
    analysisResult?.textAnalysis?.feedback || [],
    opportunities,
    { dedupeOpportunities: !hasRewriteResults }
  );
  const vacancies = marketData?.vacancies || [];
  const visibleVacancies = showAllVacancies ? vacancies : vacancies.slice(0, 3);
  const hiddenVacancyCount = Math.max(vacancies.length - 3, 0);

  const handleImproveAllWriting = async () => {
    if (opportunities.length === 0) {
      return;
    }

    setIsImprovingAll(true);
    setRewriteError(null);

    try {
      const response = await authorizedFetch(`${API_URL}/resume/improve-writing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opportunities,
          position: analysisResult?.parsedResume.position || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не вдалося покращити формулювання.");
      }

      const nextResultsById: Record<string, RewriteSuggestion[]> = {};
      (data.items || []).forEach((item: { id: string; variants: RewriteSuggestion[] }) => {
        nextResultsById[item.id] = item.variants || [];
      });

      setRewriteResultsById(nextResultsById);
    } catch (error) {
      setRewriteError(
        error instanceof Error ? error.message : "Не вдалося покращити формулювання."
      );
    } finally {
      setIsImprovingAll(false);
    }
  };

  return (
    <div className="dashboard-panel scrollable-panel custom-scrollbar">
      <h2 className="panel-title">
        <Lightbulb className="text-yellow-400" size={20} />
        Інсайти
      </h2>

      <div className="insight-card market-context-card">
        <h3 className="card-subtitle">Ринковий контекст</h3>
        {isAnalyzing ? (
          <p className="card-text">
            Збираємо ринкові дані та формуємо короткий контекст по позиції.
          </p>
        ) : (
          <>
            <p className="card-text">{marketInsight}</p>
            {marketData && (
              <>
                <div className="insight-meta-grid">
                  <div className="insight-meta-item">
                    <span className="insight-meta-label">Позиція</span>
                    <span className="insight-meta-value">
                      {marketData.positionTitle || analysisResult?.parsedResume.position || "—"}
                    </span>
                  </div>
                  <div className="insight-meta-item">
                    <span className="insight-meta-label">Досвід</span>
                    <span className="insight-meta-value">
                      {marketData.typicalExperience || "—"}
                    </span>
                  </div>
                </div>

                {vacancies.length > 0 && (
                  <div className="market-vacancies-block">
                    <div className="market-vacancies-header">
                      <h4 className="market-vacancies-title">Знайдені вакансії</h4>
                    </div>

                    <div className="market-vacancies-list">
                      {visibleVacancies.map((vacancy, index) => (
                        <a
                          key={`${vacancy.source}-${vacancy.url}-${index}`}
                          className="market-vacancy-link"
                          href={vacancy.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <div className="market-vacancy-copy">
                            <span className="market-vacancy-source">
                              {sourceLabels[vacancy.source] || vacancy.source}
                            </span>
                            <span className="market-vacancy-title">{getVacancyTitle(vacancy)}</span>
                          </div>
                          <ExternalLink size={14} className="market-vacancy-icon" />
                        </a>
                      ))}
                    </div>

                    {!showAllVacancies && hiddenVacancyCount > 0 && (
                      <button
                        type="button"
                        className="market-vacancies-more"
                        onClick={() => setShowAllVacancies(true)}
                      >
                        Показати ще {hiddenVacancyCount}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="writing-insights-section">
        <div className="writing-insights-header">
          <h3 className="card-subtitle">Покращення формулювань</h3>
          <PenLine size={16} />
        </div>
        <p className="card-text">
          Практичні рекомендації на основі текстового аналізу резюме: що саме
          виглядає слабко і як зробити формулювання переконливішим.
        </p>

        {rewriteError && <div className="writing-rewrite-error">{rewriteError}</div>}

        <div className="writing-tip-list">
          {isAnalyzing ? (
            <div className="writing-tip-card">
              <p className="card-text">Аналізуємо текст резюме.</p>
            </div>
          ) : writingTips.length ? (
            writingTips.map((tip) => {
              const variants = rewriteResultsById[tip.id] || [];

              return (
                <div key={tip.id} className="writing-tip-card">
                  <div className="writing-tip-header">
                    <div>
                      <span className="writing-tip-title">{tip.title}</span>
                      <div className="writing-tip-meta">
                        <span className={`writing-tip-priority ${tip.priorityClass}`}>
                          {tip.priority}
                        </span>
                        <span className="writing-tip-section">{tip.section}</span>
                      </div>
                    </div>
                  </div>

                  {tip.sourceMessage && (
                    <div className="writing-tip-block problem">
                      <span className="writing-tip-label">Проблема</span>
                      <p>{tip.sourceMessage}</p>
                    </div>
                  )}

                  <div className="writing-tip-block">
                    <span className="writing-tip-label">Як покращити</span>
                    <p>{tip.description}</p>
                  </div>

                  <div className="writing-tip-block formula">
                    <span className="writing-tip-label">Формула</span>
                    <p>{tip.template}</p>
                  </div>

                  {tip.opportunity && variants.length > 0 && (
                    <div className="writing-rewrite-results">
                      <div className="writing-before-card">
                        <span className="writing-tip-label">До</span>
                        <p>{tip.opportunity.sourceText}</p>
                      </div>

                      {variants.map((variant, index) => (
                        <div key={`${tip.id}-variant-${index}`} className="writing-after-card">
                          <span className="writing-tip-label">Після {index + 1}</span>
                          <p>{variant.text}</p>
                          <span className="writing-rewrite-note">{variant.whyItWorks}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="writing-tip-card">
              <p className="card-text">
                Після аналізу тут з'являться рекомендації щодо сильніших формулювань.
              </p>
            </div>
          )}

          {opportunities.length > 0 && (
            <button
              type="button"
              className="writing-improve-button"
              onClick={() => void handleImproveAllWriting()}
              disabled={isImprovingAll}
            >
              <Sparkles size={14} />
              {isImprovingAll
                ? "Покращуємо всі формулювання..."
                : hasRewriteResults
                  ? "Оновити всі варіанти"
                  : "Покращити формулювання"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
