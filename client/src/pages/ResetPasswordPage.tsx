import { Button } from "../components/ui/button";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Logo } from "../components/Logo";
import { API_URL } from "../lib/api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!token) {
      setError("Посилання для скидання пароля недійсне.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Будь ласка, заповніть усі поля");
      return;
    }

    if (password.length < 8) {
      setError("Пароль повинен містити мінімум 8 символів");
      return;
    }

    if (password !== confirmPassword) {
      setError("Паролі не співпадають");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не вдалося оновити пароль.");
      }

      setSuccessMessage("Пароль успішно змінено. Повертаємо вас на сторінку входу.");
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не вдалося оновити пароль.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-container auth-page">
      <header className="header">
        <div className="container header-content">
          <Logo />
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
            <h1 className="auth-title">Новий пароль</h1>
            <p className="auth-subtitle">Створіть новий пароль для свого акаунта Resumatch.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Новий пароль</label>
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
                  onClick={() => setShowPassword((current) => !current)}
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
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm p-3 rounded-lg mb-4">
                {successMessage}
              </div>
            )}

            <Button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isLoading || !token}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Оновлюємо пароль...
                </>
              ) : (
                "Зберегти новий пароль"
              )}
            </Button>
          </form>

          <p className="auth-footer-text">
            <Link to="/login" className="auth-link">Повернутися до входу</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
