import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api/auth';
import { flashcardAPI } from '../api/flashcard';
import './Navbar.css';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [dueCount, setDueCount] = useState(0);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setDueCount(0);
      return;
    }
    
    const fetchDueCount = async () => {
      try {
        const { data } = await flashcardAPI.getDueCount();
        setDueCount(data.due_count || 0);
      } catch (err) {
        console.error('Failed to fetch due count', err);
      }
    };

    fetchDueCount();
  }, [isAuthenticated, location.pathname]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await authAPI.logout(refreshToken);
      } catch {
        // Even if API fails, still clear local state
      }
    }
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/stories', label: t('nav.stories') },
    ...(isAuthenticated
      ? [
          { to: '/vocabulary', label: t('nav.vocabulary') },
          { 
            to: '/flashcard', 
            label: (
              <span className="nav-label-with-badge">
                {t('nav.flashcard')}
                {dueCount > 0 && <span className="nav-due-badge">{dueCount}</span>}
              </span>
            )
          },
          { to: '/dashboard', label: t('nav.progress') },
        ]
      : []),
  ];

  return (
    <nav className="navbar glass" id="main-navbar">
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" id="navbar-logo">
          <div className="logo-icon-container">
            <span className="material-symbols-outlined logo-icon">translate</span>
          </div>
          <span className="logo-text">Golingo</span>
        </Link>

        {/* Nav Links */}
        <div className="navbar-links" id="navbar-links">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="navbar-actions" id="navbar-actions">
          {/* Language Switcher */}
          <div className="navbar-lang-selector" id="lang-toggle">
            <button
              className={`lang-btn ${i18n.language === 'vi' || i18n.language.startsWith('vi') ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('vi')}
            >
              VI
            </button>
            <button
              className={`lang-btn ${i18n.language === 'en' || i18n.language.startsWith('en') ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('en')}
            >
              EN
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            className="navbar-theme-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            id="theme-toggle"
          >
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <div className="navbar-divider"></div>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="navbar-user" ref={dropdownRef}>
              <button 
                className="navbar-username-btn" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="navbar-avatar" />
                ) : (
                  <div className="navbar-avatar-placeholder">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="navbar-username">{user?.username}</span>
                <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
              </button>

              {isDropdownOpen && (
                <div className="navbar-dropdown glass animate-slide-up">
                  <div className="dropdown-header">
                    <p className="dropdown-email">{user?.email}</p>
                  </div>
                  {(user?.role === 'admin' || user?.role === 'editor') && (
                    <>
                      <Link 
                        to="/admin" 
                        className="dropdown-item"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Admin Panel
                      </Link>
                      <div className="dropdown-divider"></div>
                    </>
                  )}
                  <Link 
                    to="/profile" 
                    className="dropdown-item"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item text-danger" 
                    onClick={handleLogout}
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="btn-login" id="login-btn">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="btn-neon-primary" id="register-btn">
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

