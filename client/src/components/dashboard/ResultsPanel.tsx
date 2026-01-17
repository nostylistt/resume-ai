import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import "../../App.css";

const data = [
  { subject: 'Технічні', A: 120, fullMark: 150 },
  { subject: 'Soft Skills', A: 98, fullMark: 150 },
  { subject: 'Досвід', A: 86, fullMark: 150 },
  { subject: 'Освіта', A: 99, fullMark: 150 },
  { subject: 'Мови', A: 85, fullMark: 150 },
  { subject: 'Інструменти', A: 65, fullMark: 150 },
];

export const ResultsPanel = () => {
  return (
    <div className="dashboard-panel scrollable-panel custom-scrollbar">
      <div className="results-header">
        <h2 className="panel-title" style={{marginBottom: 0}}>Результати аналізу</h2>
        <span className="update-badge">UPDATED JUST NOW</span>
      </div>

      <div className="gauge-container">
        <div className="gauge-circle">
            <div className="gauge-arc"></div>
            <div className="text-center">
                <div className="score-text">88<span className="score-total">/100</span></div>
                <div className="score-label">Відмінно</div>
            </div>
        </div>
        <p className="upload-desc" style={{marginTop: '16px'}}>Висока відповідність до позиції</p>
      </div>

      <div className="tabs-container">
        <button className="tab-btn active">Навички</button>
        <button className="tab-btn">Структура</button>
        <button className="tab-btn">Текст</button>
      </div>

      <div className="charts-grid">
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
              <Radar name="My Skills" dataKey="A" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="keywords-section">
            <h4 className="keywords-title">Знайдені ключові слова</h4>
            <div className="tags-cloud">
                {['React', 'TypeScript', 'Node.js', 'Tailwind', 'Git', 'REST API', 'Figma'].map((skill) => (
                    <span key={skill} className="tag tag-matched">
                        {skill}
                    </span>
                ))}
                {['Docker', 'AWS'].map((skill) => (
                    <span key={skill} className="tag tag-missing">
                        {skill}
                    </span>
                ))}
            </div>
        </div>
      </div>

      <div className="metrics-section">
        <div className="metric-bar-container">
            <div className="metric-header">
                <span>Структурний Рейтинг</span>
                <span style={{color: 'white', fontWeight: 700}}>90%</span>
            </div>
            <div className="progress-track">
                <div className="progress-fill"></div>
            </div>
        </div>

        <div className="readability-grid">
            <div className="readability-item">
                <div className="read-value">65</div>
                <div className="read-label">Flesch Score</div>
            </div>
            <div className="readability-item">
                <div className="read-value">12</div>
                <div className="read-label">Слів / Речення</div>
            </div>
            <div className="readability-item">
                 <div className="read-value" style={{color: '#4ade80'}}>Low</div>
                 <div className="read-label">Passive Voice</div>
            </div>
        </div>
      </div>

    </div>
  );
};
