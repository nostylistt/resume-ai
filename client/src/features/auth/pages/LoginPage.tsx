import { Button } from "../../../shared/components/ui/button";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Logo } from "../../../shared/components/Logo";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { login, isLoading, error, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!email || !password) {
      setSubmitError("Будь ласка, заповніть всі поля");
      return;
    }

    try {
      await login(email, password, rememberMe);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Не вдалося увійти.";
      setSubmitError(message);
    }
  };

  return (
    <div className="landing-container auth-page">
      <header className="header">
        <div className="container header-content">
          <Logo />
          <div className="header-actions">
            <Link to="/register">
              <Button className="btn btn-primary">Зареєструватися</Button>
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
            <h1 className="auth-title">Вхід до акаунту</h1>
            <p className="auth-subtitle">Раді бачити вас знову!</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
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
                  placeholder="••••••••"
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

            <div className="auth-options">
              <label className="auth-checkbox-wrapper">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="auth-checkbox-label">Запам'ятати мене</span>
              </label>
              <Link to="/forgot-password" className="auth-forgot-link">Забули пароль?</Link>
            </div>

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
                  Вхід...
                </>
              ) : (
                "Увійти"
              )}
            </Button>
          </form>

          <p className="auth-footer-text">
            Немає акаунту? <Link to="/register" className="auth-link">Зареєструватися</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
