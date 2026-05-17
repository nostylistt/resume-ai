import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, History, LogOut, LockKeyhole, User, X } from "lucide-react";
import { useAuthStore } from "../../auth/store/useAuthStore";
import { InputPanel } from "../components/InputPanel";
import { ResultsPanel } from "../components/ResultsPanel";
import { InsightsPanel } from "../components/InsightsPanel";
import { AnalysisLoader } from "../components/AnalysisLoader";
import { HistoryPanel } from "../components/HistoryPanel";
import { ChangePasswordModal } from "../components/ChangePasswordModal";
import { Logo } from "../../../shared/components/Logo";
import { API_URL, authorizedFetch } from "../../../shared/lib/api";
import type {
  ResumeAnalysisHistoryItem,
  ResumeAnalysisHistoryRecord,
  ResumeAnalysisResult,
  UploadAnalysisResponse,
} from "../../../shared/types/analysis";

const MAX_RESUME_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [historyItems, setHistoryItems] = useState<ResumeAnalysisHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryItemLoading, setIsHistoryItemLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);

  const canAnalyze = useMemo(() => Boolean(selectedFile) && !isAnalyzing, [selectedFile, isAnalyzing]);

  const handleUnauthorized = useCallback(() => {
    void logout();
  }, [logout]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
    if (file && file.size > MAX_RESUME_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setActiveHistoryId(null);
      setAnalysisError("Файл завеликий. Максимальний розмір резюме — 10 МБ.");
      return;
    }

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
      const message = error instanceof Error ? error.message : "Сталася помилка під час аналізу.";
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

  const openChangePassword = () => {
    setIsProfileMenuOpen(false);
    setIsSecurityOpen(true);
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    void logout();
  };

  return (
    <div className="dashboard-container">
      <div className="auth-bg-glow auth-bg-glow-1" />
      <div className="auth-bg-glow auth-bg-glow-2" />

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

          <div className="user-block" ref={profileMenuRef}>
            <button
              type="button"
              className={`profile-trigger ${isProfileMenuOpen ? "active" : ""}`}
              onClick={() => setIsProfileMenuOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              aria-label="Відкрити меню профілю"
            >
              <div className="user-info">
                <span className="user-name">{user?.full_name || user?.email}</span>
                <span className="user-email">{user?.email}</span>
              </div>
              <div className="user-avatar">
                <User size={16} />
              </div>
              <ChevronDown size={16} className={`profile-chevron ${isProfileMenuOpen ? "open" : ""}`} />
            </button>

            {isProfileMenuOpen ? (
              <div className="profile-menu" role="menu" aria-label="Меню профілю">
                <button type="button" className="profile-menu-item" onClick={openChangePassword} role="menuitem">
                  <LockKeyhole size={16} />
                  Змінити пароль
                </button>
                <button
                  type="button"
                  className="profile-menu-item profile-menu-item-danger"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <LogOut size={16} />
                  Вийти
                </button>
              </div>
            ) : null}
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

      <ChangePasswordModal isOpen={isSecurityOpen} onClose={() => setIsSecurityOpen(false)} />

      {isAnalyzing && <AnalysisLoader />}
    </div>
  );
}
