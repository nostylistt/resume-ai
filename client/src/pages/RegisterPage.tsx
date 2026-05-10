import { Button } from "../components/ui/button";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Logo } from "../components/Logo";

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { register, isLoading, error, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!fullName || !email || !password || !confirmPassword) {
      setSubmitError("Будь ласка, заповніть всі поля");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Паролі не співпадають");
      return;
    }

    if (password.length < 8) {
      setSubmitError("Пароль повинен містити мінімум 8 символів");
      return;
    }
    
    if (!termsAccepted) {
      setSubmitError("Ви повинні погодитися з умовами");
      return;
    }

    try {
      await register(email, password, fullName);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не вдалося створити акаунт.";
      setSubmitError(message);
    }
  };

  return (
    <div className="landing-container auth-page">
      <header className="header">
        <div className="container header-content">
          <Logo />
          <div className="header-actions">
            <Link to="/login">
              <Button variant="ghost" className="btn btn-ghost">Увійти</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="auth-container">
        <div className="auth-bg-glow auth-bg-glow-1" />
        <div className="auth-bg-glow auth-bg-glow-2" />
        
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-header">
            <h1 className="auth-title">Створити акаунт</h1>
            <p className="auth-subtitle">Почніть покращувати своє резюме вже сьогодні</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Ім'я</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-input-icon" />
                <input 
                  type="text" 
                  className="auth-input" 
                  placeholder="Ваше ім'я"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input 
                  type="email" 
                  className="auth-input" 
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Пароль</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="auth-input" 
                  placeholder="Мінімум 8 символів"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Підтвердіть пароль</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  className="auth-input" 
                  placeholder="Повторіть пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="auth-checkbox-wrapper auth-terms">
              <input 
                type="checkbox" 
                className="auth-checkbox" 
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span className="auth-checkbox-label">
                Я погоджуюся з <a href="#" className="auth-link">Умовами використання</a> та <a href="#" className="auth-link">Політикою конфіденційності</a>
              </span>
            </label>

            {(error || submitError) && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-4">
                {submitError || error}
              </div>
            )}

            <Button 
              type="submit" 
              className="btn btn-primary auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Створення акаунту...
                </>
              ) : (
                "Створити акаунт"
              )}
            </Button>
          </form>

          <p className="auth-footer-text">
            Вже маєте акаунт? <Link to="/login" className="auth-link">Увійти</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
