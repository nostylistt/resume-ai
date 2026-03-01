import { Button } from "../components/ui/button";
import { motion } from "framer-motion";
import { Eye, Upload, FileText, Sparkles, Target, BarChart3, LayoutList, BookOpen, Lightbulb, Zap, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";

export function LandingPage() {
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
            AI-аналіз резюме <span className="text-blue">для кращих шансів</span> на оффер
          </motion.h1>
          <motion.p 
            className="hero-desc"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
            }}
          >
            Resume AI допомагає оцінити ваше резюме, знайти слабкі місця та покращити його під конкретну вакансію за допомогою штучного інтелекту.
          </motion.p>
          <motion.div 
            className="hero-features"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
            }}
          >
            {[
              { icon: Target, text: "Аналіз під конкретну вакансію" },
              { icon: Zap, text: "Результати за секунди" },
              { icon: CheckCircle, text: "Зрозуміла оцінка і поради" }
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
              <Button className="btn btn-primary">Почати аналіз резюме</Button>
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
                  <div className="resume-name">Василь Липченко</div>
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
          <h2 className="section-title">Як це працює</h2>
          <p className="section-subtitle">Три прості кроки до ідеального резюме</p>
          <div className="how-grid">
            {[{
              icon: Upload,
              title: "Завантажте резюме",
              desc: "Підтримуємо формати PDF та DOCX. Система автоматично розпізнає структуру вашого резюме."
            },{
              icon: FileText,
              title: "Додайте опис вакансії",
              desc: "Додайте текст вакансії, щоб система могла порівняти ваші навички з вимогами роботодавця."
            },{
              icon: Sparkles,
              title: "Отримайте AI-рекомендації",
              desc: "Миттєвий звіт зі скорингом, аналізом навичок та конкретними порадами щодо покращення вашого резюме."
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
          <h2 className="section-title">Що ви отримаєте</h2>
          <div className="features-grid">
            {[{
              icon: Target,
              title: "Загальний бал відповідності",
              desc: "Комплексна оцінка резюме від 0 до 100 на основі багатьох факторів успіху."
            },{
              icon: BarChart3,
              title: "Аналіз навичок",
              desc: "Детальний розбір: які навички збігаються, яких не вистачає, а які є зайвими."
            },{
              icon: LayoutList,
              title: "Перевірка структури",
              desc: "Аналіз розділів, порядку подачі інформації та логічної зв'язності документу."
            },{
              icon: BookOpen,
              title: "Читабельність тексту",
              desc: "Перевірка на використання активної мови, довжини речень та зрозумілість формулювань."
            },{
              icon: Lightbulb,
              title: "AI-рекомендації",
              desc: "Персоналізовані поради від штучного інтелекту для підвищення шансів на інтерв'ю."
            }].map((feature, i) => (
              <motion.div
                key={i}
                className="feature-item"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <feature.icon size={28} className="feature-icon" />
                <div className="feature-title">{feature.title}</div>
                <p className="feature-desc">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="example" className="section relative">
        <div className="container">
          <h2 className="section-title">Приклад AI-покращення</h2>
          <p className="section-subtitle">Як ми допомагаємо зробити ваше резюме більш професійним</p>
          
          <div className="example-comparison">
            <motion.div
              className="example-card example-before"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="example-label">BEFORE</div>
              <p className="example-text">
                "Відповідав за продажі в регіоні та спілкування з клієнтами. Робив звіти кожного місяця."
              </p>
            </motion.div>
            
            <motion.div
              className="example-arrow"
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              viewport={{ once: true }}
            >→</motion.div>
            
            <motion.div
              className="example-card example-after"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="example-label">AFTER</div>
              <div className="example-checkmark">✓</div>
              <p className="example-text">
                "Збільшив обсяг продажів у регіоні на 25% за 6 місяців шляхом залучення 15 нових ключових клієнтів. Автоматизував щомісячну звітність."
              </p>
            </motion.div>
          </div>
          
          <div className="example-note">
            Покращено читабельність та вплив формулювань
          </div>
        </div>
      </section>

      <section id="pricing" className="section relative">
        <div className="blur-shape blur-center-bottom" />
        <div className="container relative">
          <h2 className="section-title">Прості та прозорі ціни</h2>
          <p className="section-subtitle">Оберіть план, що відповідає вашим потребам</p>
          <div className="pricing-grid">
            {[{
              plan: "Free",
              subtitle: "Базовий аналіз резюме",
              price: "$0",
              period: "/ міс",
              features: ["1 аналіз на місяць", "Базовий скоринг", "Перевірка структури"],
              buttonText: "Почати безкоштовно"
            },{
              plan: "Pro",
              subtitle: "Для активного пошуку",
              price: "$9",
              period: "/ міс",
              highlight: true,
              popular: true,
              features: ["15 аналізів на місяць", "Повний AI-аналіз", "Історія версій", "Детальні рекомендації"],
              buttonText: "Обрати Pro"
            },{
              plan: "Premium",
              subtitle: "Максимальні можливості",
              price: "$19",
              period: "/ міс",
              features: ["Необмежені аналізи", "Експорт PDF звітів", "Пріоритетна підтримка", "Всі Pro функції"],
              buttonText: "Обрати Premium"
            }].map((p, i) => (
              <motion.div
                key={i}
                className={`pricing-card ${p.highlight ? "pricing-card-highlight" : ""}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                viewport={{ once: true }}
              >
                <div className="pricing-header">
                  <div className="pricing-plan-row">
                    <div className="pricing-plan-name">{p.plan}</div>
                    {p.popular && <span className="popular-badge">POPULAR</span>}
                  </div>
                  <div className="pricing-subtitle">{p.subtitle}</div>
                </div>
                <div className="pricing-price">
                  <span className="price-value">{p.price}</span>
                  <span className="price-period">{p.period}</span>
                </div>
                <ul className="pricing-features">
                  {p.features.map((f, idx) => (
                    <li key={idx}>✓ {f}</li>
                  ))}
                </ul>
                <Button className={p.highlight ? "btn btn-primary pricing-btn" : "btn btn-outline pricing-btn"}>{p.buttonText}</Button>
              </motion.div>
            ))}
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
            <h2 className="cta-title">Готові покращити своє резюме?</h2>
            <p className="cta-subtitle">Почніть безкоштовно та отримайте результат вже сьогодні.</p>
            <div className="cta-actions">
              <Link to="/register">
                <Button className="btn btn-primary">Спробувати зараз</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="btn btn-outline">Увійти</Button>
              </Link>
            </div>
            <p className="cta-note">Без кредитної картки</p>
          </motion.div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-content">
          <div className="footer-copyright">© 2025 Resume AI</div>
          <nav className="footer-nav">
            <a href="#how">Як це працює</a>
            <a href="#features">Що ви отримаєте</a>
            <a href="#example">Приклад</a>
            <a href="#pricing">Ціни</a>
          </nav>
          <div className="footer-lang">
            <span className="lang-active">UA</span>
            <span className="lang-divider">|</span>
            <a href="#" className="lang-link">EN</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
