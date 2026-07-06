import { useTranslation } from 'react-i18next';
import './Footer.css';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer" id="main-footer">
      <div className="footer-inner container">
        {/* Left: Brand & Copyright */}
        <div className="footer-brand">
          <div className="footer-logo">Golingo</div>
          <p className="footer-copyright">
            © {new Date().getFullYear()} Golingo. {t('home.footer.tagline')}
          </p>
        </div>

        {/* Center: Links */}
        <div className="footer-links">
          <a href="#" className="footer-link">{t('home.footer.terms')}</a>
          <a href="#" className="footer-link">{t('home.footer.privacy')}</a>
          <a href="#" className="footer-link">{t('home.footer.careers')}</a>
          <a href="#" className="footer-link">{t('home.footer.contact')}</a>
        </div>

        {/* Right: Social icons */}
        <div className="footer-socials">
          <button className="footer-social-btn" aria-label="Public">
            <span className="material-symbols-outlined">public</span>
          </button>
          <button className="footer-social-btn" aria-label="Share">
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
