import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, History, LogOut, User, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { Button } from "../components/ui/button";
import { InputPanel } from "../components/dashboard/InputPanel";
import { ResultsPanel } from "../components/dashboard/ResultsPanel";
import { InsightsPanel } from "../components/dashboard/InsightsPanel";
import { AnalysisLoader } from "../components/dashboard/AnalysisLoader";
import { HistoryPanel } from "../components/dashboard/HistoryPanel";
import { Logo } from "../components/Logo";
import { API_URL, authorizedFetch } from "../lib/api";
import type {
  ResumeAnalysisHistoryItem,
  ResumeAnalysisHistoryRecord,
  ResumeAnalysisResult,
  UploadAnalysisResponse,
} from "../types/analysis";
import "../App.css";

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [historyItems, setHistoryItems] = useState<ResumeAnalysisHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryItemLoading, setIsHistoryItemLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);

  const canAnalyze = useMemo(() => Boolean(selectedFile) && !isAnalyzing, [selectedFile, isAnalyzing]);

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const loadHistory = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await authorizedFetch(`${API_URL}/resume/history`);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не вдалося завантажити історію аналізів.");
      }

      setHistoryItems((data.items || []) as ResumeAnalysisHistoryItem[]);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Не вдалося завантажити історію аналізів."
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }, [handleUnauthorized, user?.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setAnalysisError(null);
    setActiveHistoryId(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile || isAnalyzing) {
      return;
    }

    const formData = new FormData();
    formData.append("resume", selectedFile);

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const response = await authorizedFetch(`${API_URL}/resume/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = (await response.json()) as Partial<UploadAnalysisResponse> & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Не вдалося проаналізувати резюме.");
      }

      const result = data as UploadAnalysisResponse;
      setAnalysisResult(result);
      setActiveHistoryId(result.historyEntry?.id ?? null);
      void loadHistory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Сталася помилка під час аналізу.";
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleHistorySelect = async (analysisId: number) => {
    setIsHistoryItemLoading(true);
    setHistoryError(null);

    try {
      const response = await authorizedFetch(`${API_URL}/resume/history/${analysisId}`);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не вдалося відкрити збережений аналіз.");
      }

      const analysis = data.analysis as ResumeAnalysisHistoryRecord;
      setAnalysisResult(analysis.result);
      setActiveHistoryId(analysis.id);
      setSelectedFile(null);
      setAnalysisError(null);
      setIsHistoryOpen(false);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Не вдалося відкрити збережений аналіз."
      );
    } finally {
      setIsHistoryItemLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="auth-bg-glow auth-bg-glow-1" style={{ opacity: 0.3 }} />
      <div className="auth-bg-glow auth-bg-glow-2" style={{ opacity: 0.3 }} />
      
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <Logo />
        </div>

        <div className="dashboard-nav">
          <nav className="dashboard-nav">
            <button
              type="button"
              className={`dash-nav-link dash-nav-button ${isHistoryOpen ? "active" : ""}`}
              onClick={() => setIsHistoryOpen(true)}
            >
              <History size={14} />
              Історія
            </button>
          </nav>
          <div className="nav-divider"></div>
          <div className="user-block">
            <div className="user-info">
              <span className="user-name">{user?.full_name || user?.email}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <div className="user-avatar">
              <User size={16} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="logout-btn"
              title="Вийти"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {analysisError && !isAnalyzing && (
          <div className="dashboard-error-toast" role="alert">
            <AlertCircle size={18} className="dashboard-error-icon" />
            <div className="dashboard-error-content">
              <span className="dashboard-error-title">Не вдалося проаналізувати файл</span>
              <p>{analysisError}</p>
            </div>
            <button
              type="button"
              className="dashboard-error-close"
              onClick={() => setAnalysisError(null)}
              aria-label="Закрити повідомлення"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="dashboard-column">
            <InputPanel
              selectedFile={selectedFile}
              isAnalyzing={isAnalyzing}
              canAnalyze={canAnalyze}
              onFileChange={handleFileChange}
              onAnalyze={handleAnalyze}
            />
          </div>

          <div className="dashboard-column results-column">
            <ResultsPanel analysisResult={analysisResult} analysisId={activeHistoryId} />
          </div>

          <div className="dashboard-column">
            <InsightsPanel analysisResult={analysisResult} isAnalyzing={isAnalyzing} />
          </div>
        </div>
      </main>

      <HistoryPanel
        isOpen={isHistoryOpen}
        items={historyItems}
        isLoading={isHistoryLoading}
        isLoadingItem={isHistoryItemLoading}
        error={historyError}
        activeAnalysisId={activeHistoryId}
        onClose={() => setIsHistoryOpen(false)}
        onRefresh={() => void loadHistory()}
        onSelect={(analysisId) => void handleHistorySelect(analysisId)}
      />

      {isAnalyzing && <AnalysisLoader />}
    </div>
  );
}
