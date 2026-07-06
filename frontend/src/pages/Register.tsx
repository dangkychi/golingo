import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleLogin,type CredentialResponse } from '@react-oauth/google';
import { authAPI } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import './Auth.css';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (form.password !== form.confirm) {
      setError(t('auth.password_mismatch'));
      return;
    }

    if (form.password.length < 6) {
      setError(t('auth.password_too_short'));
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.register({
        email: form.email,
        username: form.username,
        password: form.password,
      });

      // Registration successful — redirect to login
      navigate('/login', { state: { registered: true } });
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
      if (data.requires_2fa) {
        navigate('/login', { state: { requiresOTP: true, preAuthToken: data.pre_auth_token } });
        return;
      }
      login(data.user!, data.tokens!.access_token, data.tokens!.refresh_token);
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.error || t('common.error');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="auth-page" id="register-page">
      <div className="auth-container animate-slide-up">
        <div className="auth-header">
          <h1 className="auth-title">{t('auth.register_title')}</h1>
          <p className="auth-subtitle">{t('auth.register_subtitle')}</p>
        </div>

        {error && <div className="auth-error" id="register-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">{t('auth.email')}</label>
            <input className="input" id="reg-email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required disabled={isLoading} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">{t('auth.username')}</label>
            <input className="input" id="reg-username" type="text" value={form.username} onChange={(e) => update('username', e.target.value)} required disabled={isLoading} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">{t('auth.password')}</label>
            <input className="input" id="reg-password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required disabled={isLoading} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">{t('auth.confirm_password')}</label>
            <input className="input" id="reg-confirm" type="password" value={form.confirm} onChange={(e) => update('confirm', e.target.value)} required disabled={isLoading} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-submit" id="register-submit" disabled={isLoading}>
            {isLoading ? t('common.loading') : t('nav.register')}
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
        <p className="auth-switch">{t('auth.has_account')} <Link to="/login">{t('nav.login')}</Link></p>
      </div>
    </div>
  );
}
