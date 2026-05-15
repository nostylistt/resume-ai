import { Button } from "../components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Logo } from "../components/Logo";
import { API_URL } from "../lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email) {
      setError("Будь ласка, введіть email");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не вдалося надіслати лист для скидання пароля.");
      }

      setSuccessMessage(data.message || "Перевірте вашу пошту для подальших інструкцій.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не вдалося надіслати лист для скидання пароля.");
    } finally {
      setIsLoading(false);
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
            <h1 className="auth-title">Скидання пароля</h1>
            <p className="auth-subtitle">Введіть email, і ми надішлемо посилання для відновлення доступу.</p>
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
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Надсилаємо...
                </>
              ) : (
                "Надіслати посилання"
              )}
            </Button>
          </form>

          <p className="auth-footer-text">
            <Link to="/login" className="auth-link inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              Повернутися до входу
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
