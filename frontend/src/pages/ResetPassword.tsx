import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/auth';
import './Auth.css';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError(t('auth.invalid_token', 'Invalid or missing reset token.'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.password_too_short', 'Password must be at least 6 characters.'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwords_do_not_match', 'Passwords do not match.'));
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await authAPI.resetPassword({
        token,
        new_password: password,
      });
      setMessage(data.message || t('auth.reset_success', 'Password reset successfully!'));
    } catch (err: any) {
      const msg = err.response?.data?.error || t('common.error', 'An error occurred. Please try again.');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page" id="reset-password-page">
      <div className="auth-container animate-slide-up">
        <div className="auth-header">
          <h1 className="auth-title">{t('auth.reset_password_title', 'Create New Password')}</h1>
          <p className="auth-subtitle">
            {t('auth.reset_password_desc', 'Please enter your new password below.')}
          </p>
        </div>

        {!token && (
          <div className="auth-error" id="reset-no-token">
            {t('auth.missing_token_error', 'No password reset token was provided in the URL. Please request a new link.')}
          </div>
        )}

        {error && <div className="auth-error" id="reset-error">{error}</div>}
        {message && <div className="auth-success" id="reset-success">{message}</div>}

        {!message && token && (
          <form className="auth-form" onSubmit={handleSubmit} id="reset-form">
            <div className="form-group">
              <label className="form-label" htmlFor="reset-new-password">
                {t('auth.new_password', 'New Password')}
              </label>
              <input
                className="input"
                id="reset-new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-confirm-password">
                {t('auth.confirm_password', 'Confirm New Password')}
              </label>
              <input
                className="input"
                id="reset-confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              id="reset-submit"
              disabled={isLoading}
            >
              {isLoading ? t('common.loading', 'Loading...') : t('auth.reset_password_btn', 'Reset Password')}
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
