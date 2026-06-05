import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Auth.css';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login:', { email, password });
  };

  return (
    <div className="auth-page" id="login-page">
      <div className="auth-container animate-slide-up">
        <div className="auth-header">
          <h1 className="auth-title">{t('auth.login_title')}</h1>
          <p className="auth-subtitle">{t('auth.login_subtitle')}</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">{t('auth.email')}</label>
            <input className="input" id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" htmlFor="login-password">{t('auth.password')}</label>
              <Link to="/forgot-password" className="form-link">{t('auth.forgot_password')}</Link>
            </div>
            <input className="input" id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-submit" id="login-submit">{t('nav.login')}</button>
          <div className="auth-divider"><span>{t('auth.or_continue_with')}</span></div>
          <button type="button" className="btn btn-secondary btn-lg auth-google" id="google-login">
            <span>G</span> {t('auth.google')}
          </button>
        </form>
        <p className="auth-switch">{t('auth.no_account')} <Link to="/register">{t('nav.register')}</Link></p>
      </div>
    </div>
  );
}
