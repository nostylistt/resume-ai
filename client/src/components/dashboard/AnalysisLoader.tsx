import { useEffect, useState } from "react";
import "../../App.css";

const stages = [
  { id: "parse", label: "Парсинг документа" },
  { id: "structure", label: "Аналіз структури" },
  { id: "text", label: "Оцінка тексту" },
  { id: "market", label: "Ринкове порівняння" },
  { id: "score", label: "Формування оцінки" },
];

const stageDurations = [1800, 2600, 2600, 2600, 2400];

const getActiveStageIndex = (elapsed: number) => {
  let cumulative = 0;

  for (let i = 0; i < stageDurations.length; i++) {
    cumulative += stageDurations[i];

    if (elapsed < cumulative) {
      return i;
    }
  }

  return stageDurations.length - 1;
};

export const AnalysisLoader = () => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const activeIndex = getActiveStageIndex(elapsed);
  const total = stageDurations.reduce((a, b) => a + b, 0);
  const progress = Math.min((elapsed / total) * 100, 100);

  return (
    <div className="loader-overlay">
      <div className="loader-popup">
        <div className="loader-popup-header">
          <span className="loader-popup-badge">Аналіз</span>
          <h3 className="loader-popup-title">Обробляємо резюме</h3>
        </div>

        <div className="loader-popup-bar">
          <div className="loader-popup-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="loader-popup-stages">
          {stages.map((stage, i) => {
            const status = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
            return (
              <div key={stage.id} className={`loader-popup-step ${status}`}>
                <div className="loader-popup-step-icon">
                  {status === "done" ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <div className={`loader-popup-step-dot ${status}`} />
                  )}
                </div>
                <span className="loader-popup-step-label">{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
