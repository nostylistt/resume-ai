import { type FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "../../../shared/components/ui/button";
import { API_URL, authorizedFetch } from "../../../shared/lib/api";
import { useAuthStore } from "../../auth/store/useAuthStore";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REDIRECT_DELAY_MS = 1400;

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { logout } = useAuthStore();
  const logoutTimerRef = useRef<number | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current !== null) {
        window.clearTimeout(logoutTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsSubmitting(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Заповніть усі поля.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Новий пароль має містити щонайменше 8 символів.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Новий пароль і підтвердження не збігаються.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authorizedFetch(`${API_URL}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не вдалося змінити пароль.");
      }

      setSuccessMessage("Пароль змінено. Зараз перенаправимо вас на вхід.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      logoutTimerRef.current = window.setTimeout(() => {
        void logout();
      }, REDIRECT_DELAY_MS);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не вдалося змінити пароль.");
      setIsSubmitting(false);
    }
  };

  const isLocked = isSubmitting && Boolean(successMessage);

  return (
    <>
      <button
        type="button"
        className="security-overlay"
        aria-label="Закрити зміну пароля"
        onClick={() => {
          if (!isLocked) {
            onClose();
          }
        }}
      />

      <div className="security-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <div className="security-modal-header">
          <div>
            <span className="security-modal-kicker">Security</span>
            <h2 className="security-modal-title" id="change-password-title">
              Змінити пароль
            </h2>
            <p className="security-modal-subtitle">
             Для підтвердження змін введіть поточний пароль. Новий пароль має відрізнятися від поточного.
            </p>
          </div>
        </div>

        <form className="security-form" onSubmit={handleSubmit}>
          <div className="security-field">
            <label className="security-label" htmlFor="current-password">
              Поточний пароль
            </label>
            <div className="security-input-wrapper">
              <Lock size={18} className="security-input-icon" />
              <input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                className="security-input"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowCurrentPassword((value) => !value)}
                aria-label={showCurrentPassword ? "Приховати пароль" : "Показати пароль"}
                disabled={isSubmitting}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="security-field">
            <label className="security-label" htmlFor="new-password">
              Новий пароль
            </label>
            <div className="security-input-wrapper">
              <Lock size={18} className="security-input-icon" />
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                className="security-input"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowNewPassword((value) => !value)}
                aria-label={showNewPassword ? "Приховати пароль" : "Показати пароль"}
                disabled={isSubmitting}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="security-field">
            <label className="security-label" htmlFor="confirm-password">
              Підтвердіть новий пароль
            </label>
            <div className="security-input-wrapper">
              <Lock size={18} className="security-input-icon" />
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                className="security-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? "Приховати пароль" : "Показати пароль"}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error ? <div className="security-message security-message-error">{error}</div> : null}
          {successMessage ? <div className="security-message security-message-success">{successMessage}</div> : null}

          <div className="security-actions">
            <Button
              type="button"
              variant="ghost"
              className="security-secondary-button"
              onClick={onClose}
              disabled={isLocked}
            >
              Скасувати
            </Button>
            <Button type="submit" className="security-submit-button" disabled={isSubmitting}>
              {isSubmitting ? "Оновлюємо..." : "Оновити пароль"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
