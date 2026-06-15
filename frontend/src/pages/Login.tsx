import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { authAPI } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import './Auth.css';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Show success message if redirected from register
  const justRegistered = (location.state as any)?.registered;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await authAPI.login({ identifier, password });

      // Store user & tokens in global state
      login(data.user, data.tokens.access_token, data.tokens.refresh_token);

      // Redirect to home
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.error || t('common.error');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setError('');
    setIsLoading(true);

    try {
      const { data } = await authAPI.googleLogin(response.credential);
      login(data.user, data.tokens.access_token, data.tokens.refresh_token);
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.error || t('common.error');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page" id="login-page">
      <div className="auth-container animate-slide-up">
        <div className="auth-header">
          <h1 className="auth-title">{t('auth.login_title')}</h1>
          <p className="auth-subtitle">{t('auth.login_subtitle')}</p>
        </div>

        {justRegistered && (
          <div className="auth-success" id="register-success">{t('auth.register_success')}</div>
        )}

        {error && <div className="auth-error" id="login-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">{t('auth.email_or_username')}</label>
            <input className="input" id="login-email" type="text" placeholder="you@example.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required disabled={isLoading} />
          </div>
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="login-password">{t('auth.password')}</label>
              <Link to="/forgot-password" className="form-link">{t('auth.forgot_password')}</Link>
            </div>
            <input className="input" id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-submit" id="login-submit" disabled={isLoading}>
            {isLoading ? t('common.loading') : t('nav.login')}
          </button>
          <div className="auth-divider"><span>{t('auth.or_continue_with')}</span></div>
          <div className="google-btn-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError(t('common.error'))}
              useOneTap
              theme="outline"
              size="large"
              shape="rectangular"
              width="100%"
              text="continue_with"
            />
          </div>
        </form>
        <p className="auth-switch">{t('auth.no_account')} <Link to="/register">{t('nav.register')}</Link></p>
      </div>
    </div>
  );
}
