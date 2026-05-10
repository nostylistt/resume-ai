import { Lightbulb, PenLine } from "lucide-react";
import type {
  MarketData,
  ResumeAnalysisResult,
  StructureFeedbackItem,
} from "../../types/analysis";
import "../../App.css";

interface InsightsPanelProps {
  analysisResult: ResumeAnalysisResult | null;
  isAnalyzing: boolean;
}

interface WritingTip {
  title: string;
  section: string;
  priority: string;
  priorityClass: string;
  description: string;
  template: string;
  sourceMessage: string;
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
  const sample = marketData.sampleSize
    ? ` на основі ${marketData.sampleSize} вакансій`
    : "";
  const experience = marketData.typicalExperience
    ? ` Типовий рівень досвіду: ${marketData.typicalExperience}.`
    : "";

  return `Система побудувала ринковий профіль для ${position}${sample}.${experience}`;
};

const getWritingTip = (feedback: StructureFeedbackItem): WritingTip => {
  const message = feedback.message || "";
  const normalized = message.toLowerCase();
  const section = formatSection(feedback.section);
  const priority = getPriorityMeta(feedback.type);

  if (normalized.includes("кліше")) {
    return {
      title: "Замінити кліше на факти",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Замість загальних характеристик краще показати конкретну дію, контекст і результат.",
      template: "Не “командний гравець”, а “співпрацював з X, щоб досягти Y результату”.",
      sourceMessage: message,
    };
  }

  if (
    normalized.includes("цифр") ||
    normalized.includes("метрик") ||
    normalized.includes("вплив")
  ) {
    return {
      title: "Додати вимірюваний результат",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Сильний bullet має показувати не тільки дію, а й вимірюваний ефект для продукту або команди.",
      template: "Дія + що саме зроблено + результат у цифрах: “Optimized X, reducing Y by 25%”.",
      sourceMessage: message,
    };
  }

  if (normalized.includes("пасив")) {
    return {
      title: "Переписати в активній формі",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Активна форма краще показує особистий внесок кандидата і робить досвід переконливішим.",
      template: "Замість “was developed” — “Developed”, “Built”, “Implemented” або “Improved”.",
      sourceMessage: message,
    };
  }

  if (normalized.includes("довг") || feedback.section === "readability") {
    return {
      title: "Скоротити довгі речення",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Довгі речення складніше швидко сканувати, тому краще розбити їх на короткі bullets.",
      template: "Одна думка = один bullet: дія, контекст, результат.",
      sourceMessage: message,
    };
  }

  if (normalized.includes("прогалин")) {
    return {
      title: "Пояснити кар'єрну паузу",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Якщо є помітна пауза, її краще коротко пояснити, щоб не лишати простір для негативних припущень.",
      template: "Додай короткий нейтральний рядок: навчання, фриланс, релокація або особистий період.",
      sourceMessage: message,
    };
  }

  if (normalized.includes("job hopping")) {
    return {
      title: "Зняти ризик коротких періодів роботи",
      section,
      priority: priority.label,
      priorityClass: priority.className,
      description:
        "Короткі періоди роботи варто підсилити поясненням контрактного формату або конкретних завершених результатів.",
      template: "Покажи завершений результат для кожної короткої ролі: “Delivered X within Y months”.",
      sourceMessage: message,
    };
  }

  return {
    title: "Посилити опис досвіду",
    section,
    priority: priority.label,
    priorityClass: priority.className,
    description:
      "Формулювання має чітко показувати дію кандидата, контекст задачі та практичний результат.",
    template: "Сильне дієслово + задача + технологія/контекст + результат.",
    sourceMessage: message,
  };
};

const buildWritingTips = (feedback: StructureFeedbackItem[] = []) => {
  const sortedFeedback = [...feedback].sort(
    (first, second) =>
      (feedbackPriority[first.type] ?? 3) - (feedbackPriority[second.type] ?? 3)
  );

  const tips = sortedFeedback.map(getWritingTip);
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
  if (!analysisResult && !isAnalyzing) {
    return (
      <div className="dashboard-panel scrollable-panel custom-scrollbar">
        <h2 className="panel-title">
          <Lightbulb className="text-yellow-400" size={20} />
          Інсайти
        </h2>

        <div className="insights-empty-state">
          <div className="empty-state-kicker">Після аналізу</div>
          <h3 className="empty-state-title">Тут зʼявляться практичні рекомендації</h3>
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
  const writingTips = buildWritingTips(analysisResult?.textAnalysis?.feedback || []);

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
                <div className="insight-meta-item">
                  <span className="insight-meta-label">Вакансії</span>
                  <span className="insight-meta-value">
                    {marketData.sampleSize ?? "—"}
                  </span>
                </div>
                <div className="insight-meta-item">
                  <span className="insight-meta-label">Джерела</span>
                  <span className="insight-meta-value">
                    {marketData.sourceCount ?? marketData.sources?.length ?? "—"}
                  </span>
                </div>
              </div>
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

        <div className="writing-tip-list">
          {isAnalyzing ? (
            <div className="writing-tip-card">
              <p className="card-text">Аналізуємо текст резюме.</p>
            </div>
          ) : writingTips.length ? (
            writingTips.map((tip) => (
              <div key={tip.title} className="writing-tip-card">
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
              </div>
            ))
          ) : (
            <div className="writing-tip-card">
              <p className="card-text">
                Після аналізу тут з'являться рекомендації щодо сильніших формулювань.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
