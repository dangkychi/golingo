import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
        <div className="container hero-content animate-slide-up">
          <h1 className="hero-title">{t('home.hero_title')}</h1>
          <p className="hero-subtitle">{t('home.hero_subtitle')}</p>
          <div className="hero-actions">
            <Link to="/stories" className="btn btn-primary btn-lg" id="cta-start">
              {t('home.cta_start')}
              <span className="btn-arrow">→</span>
            </Link>
            <Link to="/stories" className="btn btn-secondary btn-lg" id="cta-browse">
              {t('home.cta_browse')}
            </Link>
          </div>

          {/* Stats */}
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">Stories</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Words</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Learners</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features container" id="features-section">
        <div className="features-grid">
          <div className="feature-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="feature-icon">📚</div>
            <h3 className="feature-title">{t('home.feature_read')}</h3>
            <p className="feature-desc">{t('home.feature_read_desc')}</p>
          </div>
          <div className="feature-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="feature-icon">🧠</div>
            <h3 className="feature-title">{t('home.feature_vocab')}</h3>
            <p className="feature-desc">{t('home.feature_vocab_desc')}</p>
          </div>
          <div className="feature-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="feature-icon">📊</div>
            <h3 className="feature-title">{t('home.feature_progress')}</h3>
            <p className="feature-desc">{t('home.feature_progress_desc')}</p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="how-it-works container" id="how-section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Choose a Story</h3>
            <p>Pick from our curated library of stories sorted by difficulty level.</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Read & Discover</h3>
            <p>Read the story and tap on words you don't know to save them.</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Practice & Master</h3>
            <p>Review with smart flashcards powered by spaced repetition.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
