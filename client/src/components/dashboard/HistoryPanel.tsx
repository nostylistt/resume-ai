import { AnimatePresence, motion } from "framer-motion";
import { Clock3, FileText, RefreshCw, Target, TrendingUp, X } from "lucide-react";
import type { ResumeAnalysisHistoryItem } from "../../types/analysis";
import "../../App.css";

interface HistoryPanelProps {
  isOpen: boolean;
  items: ResumeAnalysisHistoryItem[];
  isLoading: boolean;
  isLoadingItem: boolean;
  error: string | null;
  activeAnalysisId: number | null;
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (analysisId: number) => void;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getModeLabel = (analysisMode: ResumeAnalysisHistoryItem["analysisMode"]) => {
  switch (analysisMode) {
    case "full":
      return "Повний аналіз";
    case "degraded_market":
      return "Неповний ринок";
    case "no_market_profile":
      return "Без market profile";
    default:
      return "Збережений snapshot";
  }
};

export const HistoryPanel = ({
  isOpen,
  items,
  isLoading,
  isLoadingItem,
  error,
  activeAnalysisId,
  onClose,
  onRefresh,
  onSelect,
}: HistoryPanelProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            className="history-overlay"
            aria-label="Закрити історію"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />

          <motion.aside
            className="history-panel custom-scrollbar"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="history-panel-header">
              <div>
                <div className="history-panel-kicker">Analysis Snapshots</div>
                <h2 className="history-panel-title">Історія аналізів</h2>
              </div>

              <div className="history-panel-actions">
                <button
                  type="button"
                  className="history-icon-button"
                  onClick={onRefresh}
                  disabled={isLoading}
                  aria-label="Оновити історію"
                >
                  <RefreshCw size={16} className={isLoading ? "spin" : undefined} />
                </button>
                <button
                  type="button"
                  className="history-icon-button"
                  onClick={onClose}
                  aria-label="Закрити історію"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {error && (
              <div className="history-state history-state-error">
                <span>{error}</span>
              </div>
            )}

            {isLoading ? (
              <div className="history-state">Завантажуємо збережені аналізи...</div>
            ) : items.length === 0 ? (
              <div className="history-state">
                Після першого аналізу тут з’являться збережені snapshot-и з оцінками та датою запуску.
              </div>
            ) : (
              <div className="history-list">
                {items.map((item) => {
                  const isActive = item.id === activeAnalysisId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`history-card ${isActive ? "active" : ""}`}
                      onClick={() => onSelect(item.id)}
                      disabled={isLoadingItem}
                    >
                      <div className="history-card-header">
                        <span className="history-card-title">
                          {item.fileName || item.targetPosition || `Аналіз #${item.id}`}
                        </span>
                        <span className="history-card-score">
                          {item.overallScore ?? "—"}
                          <small>/100</small>
                        </span>
                      </div>

                      <div className="history-card-meta">
                        <span>
                          <Clock3 size={12} />
                          {formatDate(item.createdAt)}
                        </span>
                        <span>
                          <FileText size={12} />
                          {getModeLabel(item.analysisMode)}
                        </span>
                      </div>

                      <div className="history-card-tags">
                        <span className="history-chip">
                          <Target size={12} />
                          {item.targetPosition || "Позицію не визначено"}
                        </span>
                        <span className="history-chip">
                          <TrendingUp size={12} />
                          Market Fit {item.marketFitScore ?? "—"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
