import { UploadCloud, Sparkles, Globe } from "lucide-react";
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

      <div className="auto-detect-info">
        <Globe size={16} className="text-accent" />
        <span>Позицію та вимоги ринку визначимо автоматично з DOU, Work.ua та Robota.ua</span>
      </div>

      <button className="analyze-btn">
        <Sparkles size={20} />
        Аналізувати
      </button>
    </div>
  );
};
