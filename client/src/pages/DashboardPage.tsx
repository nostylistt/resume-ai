import { useMemo, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Button } from "../components/ui/button";
import { AlertCircle, LogOut, User, History, X } from "lucide-react";
import { InputPanel } from "../components/dashboard/InputPanel";
import { ResultsPanel } from "../components/dashboard/ResultsPanel";
import { InsightsPanel } from "../components/dashboard/InsightsPanel";
import { AnalysisLoader } from "../components/dashboard/AnalysisLoader";
import { Logo } from "../components/Logo";
import type { ResumeAnalysisResult } from "../types/analysis";
import "../App.css";

const API_URL = import.meta.env.VITE_API_URL || "https://resume-ai-back.onrender.com/api";

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const canAnalyze = useMemo(() => Boolean(selectedFile) && !isAnalyzing, [selectedFile, isAnalyzing]);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setAnalysisError(null);
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
      const response = await fetch(`${API_URL}/resume/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не вдалося проаналізувати резюме.");
      }

      setAnalysisResult(data as ResumeAnalysisResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Сталася помилка під час аналізу.";
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <Logo />
        </div>
        
        <div className="dashboard-nav">
          <nav className="dashboard-nav">
            <a href="#" className="dash-nav-link">
              <History size={14} />
              Історія
            </a>
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
                <ResultsPanel
                  analysisResult={analysisResult}
                />
            </div>

            <div className="dashboard-column">
                <InsightsPanel
                  analysisResult={analysisResult}
                  isAnalyzing={isAnalyzing}
                />
            </div>
        </div>
      </main>

      {isAnalyzing && <AnalysisLoader />}
    </div>
  );
}
