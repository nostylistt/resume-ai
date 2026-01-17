import { UploadCloud, ChevronDown, Sparkles } from "lucide-react";
import "../../App.css";

export const InputPanel = () => {
  return (
    <div className="dashboard-panel">
      <h2 className="panel-title">Аналіз Резюме</h2>

      <div className="upload-area">
        <div className="upload-icon-wrapper">
          <UploadCloud className="upload-icon" size={32} />
        </div>
        <h3 className="upload-title">Завантажити Резюме</h3>
        <p className="upload-desc">PDF, DOCX до 10MB</p>
      </div>

      <div className="job-input-section">
        <div className="job-input-header">
          <h3 className="job-input-title">Введіть Опис Вакансії</h3>
          <button className="job-select-link">
            Оберіть зі збережених <ChevronDown size={12} />
          </button>
        </div>
        <textarea
          className="job-textarea custom-scrollbar"
          placeholder="Вставте текст вакансії сюди для найкращого аналізу відповідності..."
        />
      </div>

      <button className="analyze-btn">
        <Sparkles size={20} />
        Аналізувати
      </button>
    </div>
  );
};
