import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/auth';
import './Auth.css';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const { data } = await authAPI.forgotPassword(email);
      setMessage(data.message || t('auth.forgot_success', 'A password reset link has been sent if the email exists.'));
    } catch (err: any) {
      const msg = err.response?.data?.error || t('common.error', 'An error occurred. Please try again.');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page" id="forgot-password-page">
      <div className="auth-container animate-slide-up">
        <div className="auth-header">
          <h1 className="auth-title">{t('auth.forgot_password_title', 'Reset Password')}</h1>
          <p className="auth-subtitle">
            {t('auth.forgot_password_desc', 'Enter your email address and we will send you a link to reset your password.')}
          </p>
        </div>

        {error && <div className="auth-error" id="forgot-error">{error}</div>}
        {message && <div className="auth-success" id="forgot-success">{message}</div>}

        {!message && (
          <form className="auth-form" onSubmit={handleSubmit} id="forgot-form">
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">
                {t('auth.email', 'Email Address')}
              </label>
              <input
                className="input"
                id="forgot-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              id="forgot-submit"
              disabled={isLoading}
            >
              {isLoading ? t('common.loading', 'Loading...') : t('auth.send_reset_link', 'Send Reset Link')}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login" id="back-to-login">
            {t('auth.back_to_login', 'Back to Login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
