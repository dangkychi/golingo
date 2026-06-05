import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Auth.css';

export default function Register() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Register:', form);
  };

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="auth-page" id="register-page">
      <div className="auth-container animate-slide-up">
        <div className="auth-header">
          <h1 className="auth-title">{t('auth.register_title')}</h1>
          <p className="auth-subtitle">{t('auth.register_subtitle')}</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">{t('auth.email')}</label>
            <input className="input" id="reg-email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">{t('auth.username')}</label>
            <input className="input" id="reg-username" type="text" value={form.username} onChange={(e) => update('username', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">{t('auth.password')}</label>
            <input className="input" id="reg-password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">{t('auth.confirm_password')}</label>
            <input className="input" id="reg-confirm" type="password" value={form.confirm} onChange={(e) => update('confirm', e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-submit" id="register-submit">{t('nav.register')}</button>
          <div className="auth-divider"><span>{t('auth.or_continue_with')}</span></div>
          <button type="button" className="btn btn-secondary btn-lg auth-google"><span>G</span> {t('auth.google')}</button>
        </form>
        <p className="auth-switch">{t('auth.has_account')} <Link to="/login">{t('nav.login')}</Link></p>
      </div>
    </div>
  );
}
