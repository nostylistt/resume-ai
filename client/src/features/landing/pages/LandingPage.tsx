import { Button } from "../../../shared/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Upload, Search, Sparkles, Target, BarChart3, LayoutList, BookOpen, Lightbulb, Zap, CheckCircle, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Header } from "../../../shared/components/Header";
import { Logo } from "../../../shared/components/Logo";

export function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  const featuresList = [{
    icon: Target,
    title: "Оцінка відповідності",
    desc: "Наскільки ваше резюме відповідає тому, що зараз шукають на ринку - з конкретним балом."
  },{
    icon: BarChart3,
    title: "Порівняння навичок",
    desc: "Бачите, які ваші технології збігаються з вимогами, яких не вистачає, і що додати в першу чергу."
  },{
    icon: LayoutList,
    title: "Аудит структури",
    desc: "Чи є всі потрібні розділи, чи логічно подана інформація, і що можна покращити у форматуванні."
  },{
    icon: BookOpen,
    title: "Якість формулювань",
    desc: "Перевіряємо на кліше, пасивні конструкції та нечіткі формулювання, які знижують шанси на відгук."
  },{
    icon: Lightbulb,
    title: "Конкретні поради",
    desc: "Не загальні фрази, а точні рекомендації - що переписати, що додати, що прибрати з вашого резюме."
  }];

  return (
    <div className="landing-container">
      <Header />

      <section className="container hero-section">
        <div className="hero-bg-glow" />
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <motion.h1 
            className="hero-title"
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
            }}
          >
            Покажемо, <span className="text-blue">чого не вистачає</span> вашому резюме до ідеального офферу
          </motion.h1>
          <motion.p 
            className="hero-desc"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
            }}
          >
            Порівнюємо ваше резюме з реальними вимогами роботодавців в Україні та показуємо, що підсилити перед відгуком.
          </motion.p>
          <motion.div 
            className="hero-features"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
            }}
          >
            {[
              { icon: Globe, text: "Реальні вимоги з DOU, Work.ua, Robota.ua" },
              { icon: Zap, text: "Повний звіт за хвилину" },
              { icon: CheckCircle, text: "Жодних ручних налаштувань" }
            ].map((item, i) => (
              <motion.div 
                key={i}
                className="hero-feature-item"
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 }
                }}
              >
                <item.icon size={20} className="text-blue" />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
          <motion.div 
            className="hero-actions"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3 } }
            }}
          >
            <Link to="/register">
              <Button className="btn btn-primary">Перевірити моє резюме</Button>
            </Link>
            <a href="/#example">
                <Button variant="outline" className="btn btn-outline"><Eye size={16} /> Подивитись приклад</Button>
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="resume-3d-wrapper"
        >
          <div className="resume-card-3d">
            <div className="resume-paper">
              <div className="resume-header-section">
                <div className="resume-avatar"></div>
                <div className="resume-name-block">
                  <div className="resume-name">Тарас Шевченко</div>
                  <div className="resume-title">Senior Frontend Developer</div>
                </div>
              </div>
              
              <div className="resume-section">
                <div className="resume-section-title">Досвід</div>
                <div className="resume-line long"></div>
                <div className="resume-line medium"></div>
                <div className="resume-line short"></div>
              </div>

              <div className="resume-section">
                <div className="resume-section-title">Навички</div>
                <div className="resume-skills">
                  <span className="resume-skill">React</span>
                  <span className="resume-skill">TypeScript</span>
                  <span className="resume-skill">Node.js</span>
                </div>
              </div>

              <div className="resume-section">
                <div className="resume-section-title">Освіта</div>
                <div className="resume-line medium"></div>
                <div className="resume-line short"></div>
              </div>
            </div>

            <div className="annotation annotation-1">
              <span className="annotation-icon">✓</span>
              <span className="annotation-text">Ключові слова знайдено</span>
            </div>

            <div className="annotation annotation-2">
              <span className="annotation-icon warning">!</span>
              <span className="annotation-text">Знайдено кліше</span>
            </div>

            <div className="annotation annotation-3">
              <span className="annotation-icon">✓</span>
              <span className="annotation-text">92% відповідність</span>
            </div>

            <div className="resume-glow"></div>
          </div>
        </motion.div>
      </section>

      <section id="how" className="section relative">
        <div className="blur-shape blur-right" />
        <div className="container relative">
          <h2 className="section-title">Від завантаження до результату — одна хвилина</h2>
          <p className="section-subtitle">Вам потрібно зробити лише одну дію. Все інше ми беремо на себе.</p>
          <div className="how-grid">
            {[{
              icon: Upload,
              title: "Завантажте резюме",
              desc: "PDF або DOCX - більше нічого не потрібно. Ми самі визначимо вашу спеціалізацію та ключові навички."
            },{
              icon: Search,
              title: "Ми збираємо вимоги ринку",
              desc: "Система аналізує свіжі вакансії на DOU, Work.ua та Robota.ua і формує зріз того, що зараз шукають роботодавці."
            },{
              icon: Sparkles,
              title: "Ви отримуєте готовий звіт",
              desc: "Які ваші навички збігаються з ринком, чого бракує, і що варто підсилити - конкретно та без води."
            }].map((step, i) => (
              <motion.div
                key={i}
                className="step-item"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                viewport={{ once: true }}
              >
                <div className="step-icon-wrapper">
                  <step.icon size={28} />
                </div>
                <div className="step-number">Крок {i + 1}</div>
                <div className="step-title">{step.title}</div>
                <p className="step-desc">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="section relative">
        <div className="blur-shape blur-left" />
        <div className="container relative">
          <h2 className="section-title">Що входить в аналіз</h2>
          <p className="section-subtitle">Натисніть, щоб побачити кожен етап в дії</p>

          <div className="acc-list">
            {featuresList.map((feature, i) => (
              <div key={i} className={`acc-item ${activeFeature === i ? "open" : ""}`}>
                <button className="acc-header" onClick={() => setActiveFeature(activeFeature === i ? -1 : i)}>
                  <div className="acc-left">
                    <div className="acc-icon">
                      <feature.icon size={20} />
                    </div>
                    <span className="acc-title">{feature.title}</span>
                  </div>
                  <span className="acc-chevron">
                    {activeFeature === i ? "−" : "+"}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {activeFeature === i && (
                    <motion.div
                      className="acc-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <div className="acc-content">
                        <p className="acc-desc">{feature.desc}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="example" className="section relative">
        <div className="container">
          <h2 className="section-title">Різниця, яку помітить рекрутер</h2>
          <p className="section-subtitle">Одне й те саме досягнення — але подане так, що його неможливо проігнорувати</p>
          
          <div className="ex-comparison">
            <motion.div
              className="ex-card ex-before"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="ex-label">
                <Eye size={14} />
                BEFORE
              </div>
              <p className="ex-quote">
                "Відповідав за продажі в регіоні та спілкування з клієнтами. Робив звіти кожного місяця."
              </p>
              <div className="ex-verdict negative">Нечіткий опис без конкретики</div>
            </motion.div>
            
            <motion.div
              className="ex-arrow-wrap"
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Sparkles size={24} />
            </motion.div>
            
            <motion.div
              className="ex-card ex-after"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="ex-label">
                <CheckCircle size={14} />
                AFTER
              </div>
              <p className="ex-quote">
                "Збільшив обсяг продажів у регіоні на <strong>25%</strong> за 6 місяців шляхом залучення <strong>15 нових</strong> ключових клієнтів. Автоматизував щомісячну звітність."
              </p>
              <div className="ex-verdict positive">Конкретні цифри та результати</div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <motion.div
            className="cta-card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="cta-beta-badge">OPEN BETA</div>
            <h2 className="cta-title">Дізнайтесь, чого не вистачає вашому резюме</h2>
            <p className="cta-subtitle">Завантажте файл - і за хвилину отримайте повний звіт з порівнянням з ринком. Зараз усі функції доступні безкоштовно.</p>
            
            <div className="cta-perks">
              {[
                "Необмежена кількість аналізів",
                "Дані з DOU, Work.ua, Robota.ua",
                "Персональні рекомендації"
              ].map((f, i) => (
                <div key={i} className="cta-perk-item">
                  <CheckCircle size={16} className="text-blue" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="cta-actions">
              <Link to="/register">
                <Button className="btn btn-primary">Спробувати зараз</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="btn btn-outline">Увійти</Button>
              </Link>
            </div>
            <p className="cta-note">Безкоштовно на час бета-тесту · без зобов'язань</p>
          </motion.div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand-section">
              <div className="dashboard-brand" style={{ marginBottom: "16px" }}>
               <Logo />
              </div>
              <p className="footer-desc">
                Розумний аналіз вашого резюме.
              </p>
            </div>
            
            <div className="footer-links-section">
              <div className="footer-column">
                <h4 className="footer-col-title">Продукт</h4>
                <nav className="footer-col-nav">
                  <a href="#how">Як це працює</a>
                  <a href="#features">Що входить в аналіз</a>
                  <a href="#example">Приклад</a>
                </nav>
              </div>
              <div className="footer-column">
                <h4 className="footer-col-title">Платформа</h4>
                <nav className="footer-col-nav">
                  <Link to="/register">Спробувати безкоштовно</Link>
                  <Link to="/login">Увійти</Link>
                </nav>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <div className="footer-copyright">© 2026 Resumatch. Усі права захищено.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
