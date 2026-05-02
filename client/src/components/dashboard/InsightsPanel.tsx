import { Lightbulb, AlertTriangle, ArrowRight, Download } from "lucide-react";
import "../../App.css";

export const InsightsPanel = () => {
  return (
    <div className="dashboard-panel scrollable-panel custom-scrollbar">
      <h2 className="panel-title">
        <Lightbulb className="text-yellow-400" size={20} />
        AI Рекомендації
      </h2>

      <div className="insight-card insight-recommendation">
        <h3 className="card-subtitle">Підвищення навичок</h3>
        <p className="card-text">
          Додайте досвід роботи з <span className="highlight-text">AWS</span> та <span className="highlight-text">Docker</span>. Це підвищить вашу відповідність цій вакансії на <span className="highlight-green">~15%</span>.
        </p>
        <button className="card-link">
          Дізнатися більше <ArrowRight size={12} />
        </button>
      </div>

      <div className="warning-card">
        <AlertTriangle className="warning-icon" size={16} />
        <div>
            <h4 className="warning-title">Типові проблеми</h4>
            <p className="warning-desc">Виявлено часту зміну місць роботи за останні 3 роки.</p>
        </div>
      </div>

      <div className="comparison-section">
        <h3 className="structure-block-title">Покращення формулювань</h3>
        <div className="comparison-grid">
            <div className="compare-box compare-before">
                <div className="compare-label before">Before</div>
                <p className="compare-text">"Worked on the frontend of the app."</p>
            </div>
            <div className="compare-arrow-container">
                <div className="compare-arrow-circle">
                    <ArrowRight size={14} className="rotate-90" />
                </div>
            </div>
            <div className="compare-box compare-after">
                <div className="compare-label after">After</div>
                <p className="compare-text">"Developed responsive UI components using React and Tailwind, improving load time by 20%."</p>
            </div>
        </div>
      </div>

      <button className="export-btn">
        <Download size={16} />
        Експортувати звіт
      </button>
    </div>
  );
};
