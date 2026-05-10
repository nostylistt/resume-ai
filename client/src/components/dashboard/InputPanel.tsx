import { Globe, Sparkles, UploadCloud } from "lucide-react";
import "../../App.css";

interface InputPanelProps {
  selectedFile: File | null;
  isAnalyzing: boolean;
  canAnalyze: boolean;
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
}

export const InputPanel = ({
  selectedFile,
  isAnalyzing,
  canAnalyze,
  onFileChange,
  onAnalyze,
}: InputPanelProps) => {
  return (
    <div className="dashboard-panel">
      <h2 className="panel-title">Аналіз резюме</h2>

      <label className="upload-area" htmlFor="resume-upload">
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: "none" }}
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
        />

        <div className="upload-icon-wrapper">
          <UploadCloud className="upload-icon" size={32} />
        </div>

        <h3 className="upload-title">
          {selectedFile ? "Файл обрано" : "Завантажити резюме"}
        </h3>
        <p className="upload-desc">
          {selectedFile ? selectedFile.name : "PDF, DOCX до 10MB"}
        </p>
      </label>

      <div className="auto-detect-info">
        <Globe size={16} className="text-blue" />
        <span>
          Позицію та вимоги ринку визначимо автоматично з DOU, Work.ua та
          Robota.ua
        </span>
      </div>

      <button
        className="analyze-btn"
        onClick={onAnalyze}
        disabled={!canAnalyze}
        style={{
          opacity: canAnalyze ? 1 : 0.6,
          cursor: canAnalyze ? "pointer" : "not-allowed",
        }}
      >
        <Sparkles size={20} />
        {isAnalyzing ? "Аналізуємо..." : "Аналізувати"}
      </button>
    </div>
  );
};
