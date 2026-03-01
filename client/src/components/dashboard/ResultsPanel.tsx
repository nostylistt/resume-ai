import { useState } from "react";
import "../../App.css";

type TabId = "skills" | "structure" | "text";

const SKILLS_DATA = {
  matched: ["React", "TypeScript", "Node.js", "Tailwind", "Git", "REST API"],
  missingRequired: ["Docker"],
  missingOptional: ["AWS", "Kubernetes"],
  irrelevant: ["Figma", "Adobe XD"],
};

const totalSkills = SKILLS_DATA.matched.length + SKILLS_DATA.missingRequired.length + SKILLS_DATA.missingOptional.length + SKILLS_DATA.irrelevant.length;
const matchedPercent = Math.round((SKILLS_DATA.matched.length / totalSkills) * 100);
const missingPercent = Math.round(((SKILLS_DATA.missingRequired.length + SKILLS_DATA.missingOptional.length) / totalSkills) * 100);
const irrelevantPercent = 100 - matchedPercent - missingPercent;

const STRUCTURE_DATA = {
  sections: [
    { name: "Контакти", present: true },
    { name: "Про себе", present: true },
    { name: "Досвід", present: true },
    { name: "Освіта", present: true },
    { name: "Навички", present: true },
    { name: "Мови", present: false },
  ],
  orderLogical: true,
  volumes: [
    { section: "Про себе", vol: "optimal" as const },
    { section: "Досвід", vol: "optimal" as const },
    { section: "Освіта", vol: "short" as const },
    { section: "Навички", vol: "optimal" as const },
  ],
  criteria: [
    { name: "Повнота інформації", score: 85 },
    { name: "Логіка подачі", score: 90 },
    { name: "Ясність та релевантність", score: 88 },
    { name: "Візуальне сприйняття", score: 82 },
  ],
};

export const ResultsPanel = () => {
  const [activeTab, setActiveTab] = useState<TabId>("skills");
  return (
    <div className="dashboard-panel scrollable-panel custom-scrollbar">
      <div className="results-header">
        <h2 className="panel-title" style={{marginBottom: 0}}>Результати аналізу</h2>
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
        <button className={`tab-btn ${activeTab === "skills" ? "active" : ""}`} onClick={() => setActiveTab("skills")}>Навички</button>
        <button className={`tab-btn ${activeTab === "structure" ? "active" : ""}`} onClick={() => setActiveTab("structure")}>Структура</button>
        <button className={`tab-btn ${activeTab === "text" ? "active" : ""}`} onClick={() => setActiveTab("text")}>Текст</button>
      </div>

      {activeTab === "skills" && (
      <div className="structure-section">
        <div className="structure-block">
          <h4 className="structure-block-title">Співпадіння навичок</h4>
          <p className="structure-block-desc">Відсоток збігу навичок з резюме та вимог вакансії</p>
          <div className="skills-match-legend">
            <span className="legend-dot legend-matched" />
            <span>{matchedPercent}% зібігаються</span>
            <span className="legend-dot legend-missing" />
            <span>{missingPercent}% відсутні</span>
            <span className="legend-dot legend-irrelevant" />
            <span>{irrelevantPercent}% нерелевантні</span>
          </div>
          <div className="skills-progress-track skills-progress-segmented">
            {matchedPercent > 0 && <div className="skills-segment skills-segment-matched" style={{ width: `${matchedPercent}%` }} title={`Зібігаються: ${matchedPercent}%`} />}
            {missingPercent > 0 && <div className="skills-segment skills-segment-missing" style={{ width: `${missingPercent}%` }} title={`Відсутні: ${missingPercent}%`} />}
            {irrelevantPercent > 0 && <div className="skills-segment skills-segment-irrelevant" style={{ width: `${irrelevantPercent}%` }} title={`Нерелевантні: ${irrelevantPercent}%`} />}
          </div>
        </div>

        <div className="structure-block">
          <h4 className="structure-block-title">Зібігаються</h4>
          <p className="structure-block-desc">Навички з резюме, що є у вимогах вакансії</p>
          <div className="structure-sections">
            {SKILLS_DATA.matched.map((s) => (
              <span key={s} className="structure-pill present">{s}</span>
            ))}
          </div>
        </div>

        <div className="structure-block">
          <h4 className="structure-block-title">Відсутні</h4>
          <p className="structure-block-desc">Вимоги вакансії, яких немає в резюме (обовʼязкові та бажані)</p>
          <div className="structure-sections">
            {SKILLS_DATA.missingRequired.map((s) => (
              <span key={s} className="structure-pill missing-required" title="Обовʼязкова">{s}</span>
            ))}
            {SKILLS_DATA.missingOptional.map((s) => (
              <span key={s} className="structure-pill missing-optional" title="Бажана">{s}</span>
            ))}
          </div>
        </div>

        <div className="structure-block">
          <h4 className="structure-block-title">Нерелевантні</h4>
          <p className="structure-block-desc">Навички з резюме, яких немає у вимогах вакансії</p>
          <div className="structure-sections">
            {SKILLS_DATA.irrelevant.map((s) => (
              <span key={s} className="structure-pill missing">{s}</span>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeTab === "structure" && (
      <div className="structure-section">
        <div className="structure-block">
          <h4 className="structure-block-title">Наявність розділів</h4>
          <p className="structure-block-desc">Які основні блоки є у вашому резюме</p>
          <div className="structure-sections">
            {STRUCTURE_DATA.sections.map((s) => (
              <span key={s.name} className={`structure-pill ${s.present ? "present" : "missing"}`}>
                {s.present ? "✓" : "—"} {s.name}
              </span>
            ))}
          </div>
        </div>

        <div className="structure-block">
          <h4 className="structure-block-title">Порядок розділів</h4>
          <p className="structure-block-desc">Чи логічно розташовані блоки в резюме</p>
          <span className={`structure-order-badge ${STRUCTURE_DATA.orderLogical ? "logical" : "illogical"}`}>
            {STRUCTURE_DATA.orderLogical ? "Логічний" : "Нелогічний"}
          </span>
        </div>

        <div className="structure-block">
          <h4 className="structure-block-title">Обсяг тексту</h4>
          <p className="structure-block-desc">Оцінка розміру кожного блоку: короткий, оптимальний або задовгий</p>
          <div className="structure-volumes">
            {STRUCTURE_DATA.volumes.map((v) => (
              <div key={v.section} className="structure-volume-row">
                <span>{v.section}</span>
                <span className={`volume-pill volume-${v.vol}`}>
                  {v.vol === "short" ? "Короткий" : v.vol === "optimal" ? "Оптимальний" : "Задовгий"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="structure-block">
          <h4 className="structure-block-title">Критерії оцінки</h4>
          <p className="structure-block-desc">Загальна оцінка структурного аналізу резюме</p>
          <div className="structure-criteria">
            {STRUCTURE_DATA.criteria.map((c) => (
              <div key={c.name} className="structure-criterion-item">
                <span className="structure-criterion-name">{c.name}</span>
                <span className="structure-criterion-score">{c.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeTab === "text" && (
      <div className="structure-section text-section">
        <div className="structure-block">
          <h4 className="structure-block-title">Якість тексту</h4>
          <p className="structure-block-desc">Середня довжина речень, читабельність та пасивний стан</p>
          <div className="metric-bar-container">
            <div className="metric-header">
              <span className="structure-block-title">Загальний бал тексту</span>
              <span style={{ color: "white", fontWeight: 600 }}>78%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: "78%" }} />
            </div>
          </div>
          <div className="readability-grid">
            <div className="readability-item">
              <div className="read-value">65</div>
              <div className="read-label">Індекс читабельності (Flesch)</div>
            </div>
            <div className="readability-item">
              <div className="read-value">12</div>
              <div className="read-label">Слів у реченні (в середньому)</div>
            </div>
            <div className="readability-item">
              <div className="read-value" style={{ color: "#4ade80" }}>8%</div>
              <div className="read-label">Речення у пасивному стані</div>
            </div>
          </div>
        </div>

        <div className="structure-block">
          <h4 className="structure-block-title">Автоматичні зауваження</h4>
          <p className="structure-block-desc">Алгоритм шукає пропуски у хронології, часту зміну місць роботи та кліше</p>
          <div className="structure-volumes">
            <div className="structure-volume-row">
              <span>Пропуски у хронології досвіду</span>
              <span className="volume-pill volume-optimal">Не виявлено</span>
            </div>
            <div className="structure-volume-row">
              <span>Часта зміна місць роботи</span>
              <span className="volume-pill volume-long">Можливий ризик</span>
            </div>
            <div className="structure-volume-row">
              <span>Шаблонні фрази та кліше</span>
              <span className="volume-pill volume-short">Помірно</span>
            </div>
          </div>
        </div>
      </div>
      )}

    </div>
  );
};
