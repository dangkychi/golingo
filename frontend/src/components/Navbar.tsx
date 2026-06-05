import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import './Navbar.css';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { theme, toggleTheme } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(next);
  };

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/stories', label: t('nav.stories') },
    ...(isAuthenticated
      ? [
          { to: '/vocabulary', label: t('nav.vocabulary') },
          { to: '/flashcard', label: t('nav.flashcard') },
          { to: '/progress', label: t('nav.progress') },
        ]
      : []),
  ];

  return (
    <nav className="navbar glass" id="main-navbar">
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" id="navbar-logo">
          <span className="logo-icon">📖</span>
          <span className="logo-text">GOLingo</span>
        </Link>

        {/* Nav Links */}
        <div className="navbar-links" id="navbar-links">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-link ${location.pathname === link.to ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="navbar-actions" id="navbar-actions">
          {/* Language toggle */}
          <button
            className="navbar-icon-btn"
            onClick={toggleLanguage}
            title={i18n.language === 'en' ? 'Tiếng Việt' : 'English'}
            id="lang-toggle"
          >
            {i18n.language === 'en' ? '🇻🇳' : '🇺🇸'}
          </button>

          {/* Theme toggle */}
          <button
            className="navbar-icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            id="theme-toggle"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="navbar-user">
              <span className="navbar-username">{user?.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={logout} id="logout-btn">
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="btn btn-ghost btn-sm" id="login-btn">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" id="register-btn">
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
