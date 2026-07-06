import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import './Home.css';

export default function Home() {
  const { t } = useTranslation();
  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  const availableWords = ['Le', 'café', 'est', 'chaud'];

  const handleWordClick = (word: string) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else {
      setSelectedWords([...selectedWords, word]);
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-cyan" />
          <div className="hero-orb hero-orb-magenta" />
        </div>
        <div className="container hero-content">
          <div className="hero-text-side animate-slide-up">
            <div className="platform-tag">
              <span className="material-symbols-outlined tag-icon">language</span>
              {t('home.global_platform')}
            </div>
            <h1 className="hero-title">
              {t('home.hero_title_prefix')}
              <span className="text-highlight-cyan">{t('home.hero_title_highlight')}</span>
              {t('home.hero_title_suffix')}
            </h1>
            <p className="hero-subtitle">{t('home.hero_subtitle')}</p>
            <div className="hero-actions">
              <Link to="/stories" className="btn-neon-cyan" id="cta-start">
                <span className="material-symbols-outlined btn-icon">rocket_launch</span>
                {t('home.cta_start')}
              </Link>
              <Link to="/stories" className="btn-neon-magenta-outline" id="cta-browse">
                <span className="material-symbols-outlined btn-icon">play_circle</span>
                {t('home.cta_browse')}
              </Link>
            </div>
          </div>
          <div className="hero-image-side animate-fade-in">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlSOwQKjVTCWfpDqtShG0sh8o5ZYqlMIZWVj8gN9pPfxnWSlhkQIFeuajY8qKjNC67dz21L4AFgdn2WAo_ymKtYzxe2jdW-jRuHaMkiyaSaNy3JiNf40-0lLKDKelF5gJTUh7oXckMV5xGhv1AqkyxPaJtHLR4ERVpmwrtls5cyxrY92eqJ2MnQd7VKf9HlsjyCWorpvzNk0r2KK5AFTQtcbOVoCIqQxZODYVrxVAIRgswqWOkaKjx-jb7g_T2KE-ns8SuqJXM52s" 
              alt="Golingo hero illustration" 
              className="hero-illustration"
            />
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="bento-section container" id="features-section">
        <h2 className="bento-section-title">{t('home.bento_title')}</h2>
        
        <div className="bento-grid">
          {/* Card 1: Scientific (Wide 2-col) */}
          <div className="bento-card card-wide card-neon-cyan">
            <div className="bento-card-info">
              <div className="bento-card-header">
                <span className="material-symbols-outlined bento-icon cyan-text">biotech</span>
                <h3 className="bento-card-title">{t('home.bento_card1_title')}</h3>
              </div>
              <p className="bento-card-desc">{t('home.bento_card1_desc')}</p>
            </div>
            <div className="bento-card-visual">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgspaLLYmrVfYcDCwCItQOe-K6YPRJ7ig6xXYNsgmE8PYyC50ssPalilJvAl5mfYtqT_f5u8HJY5I_SywHA6ljxICSWAWwYb5a5z_zMPHmEHMuY9MBsx26k1k94zy6EUXSscPRvXegic38cX1u0Fb9VeAyUvAaQh_Hld4gwY0oouH-VtYDvTb1vGoGxrf3dvR6ixWtSJgP0S6uFSddG1eIsvLaYhuVXLevHIL4pm0UmmFRStBZ0Ie9OiXecr2O86CpeogPlLiNerU" 
                alt="Scientifically proven graph" 
                className="bento-image"
              />
            </div>
          </div>

          {/* Card 2: Fun (Normal 1-col) */}
          <div className="bento-card card-neon-magenta">
            <div className="bento-card-info">
              <div className="bento-card-header">
                <span className="material-symbols-outlined bento-icon magenta-text">celebration</span>
                <h3 className="bento-card-title">{t('home.bento_card2_title')}</h3>
              </div>
              <p className="bento-card-desc">{t('home.bento_card2_desc')}</p>
            </div>
          </div>

          {/* Card 3: Free (Normal 1-col) */}
          <div className="bento-card card-neon-lime">
            <div className="bento-card-info">
              <div className="bento-card-header">
                <span className="material-symbols-outlined bento-icon lime-text">payments</span>
                <h3 className="bento-card-title">{t('home.bento_card3_title')}</h3>
              </div>
              <p className="bento-card-desc">{t('home.bento_card3_desc')}</p>
            </div>
          </div>

          {/* Card 4: Languages (Wide 2-col) */}
          <div className="bento-card card-wide card-neon-lime">
            <div className="bento-card-info">
              <div className="bento-card-header">
                <span className="material-symbols-outlined bento-icon lime-text">translate</span>
                <h3 className="bento-card-title">{t('home.bento_card4_title')}</h3>
              </div>
              <p className="bento-card-desc">{t('home.bento_card4_desc')}</p>
            </div>
            <div className="bento-card-visual">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCac85NKYTtN2KhX1T2RDVx-VEZJO48x_wya7Lj5m-t1wo6Y9cNRzfZXanusu7dggu4BU0kA68TaSfSDiU156YV2kD6B04zudQIKboCGKHrQj-KimJF-SZZLGwhVeo5d4Ceze-a8xQrlWw5Cp4rQIHas7XZmXDYGiBuhS2nKkcPxS5vECmVz2cLXh6U7DA7lwUXj63_TJ6BbKlHAB-pQ-W9qrQEr0RdNf26QZwwkxRZ_NuXOHajZBly8pW4jYCvdssWexTHBOJEnHk" 
                alt="40 languages flag icons" 
                className="bento-image flags-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Methodology & Interactive Mockup Section */}
      <section className="method-section container" id="method-section">
        <div className="method-grid">
          
          {/* Left Side: Phone Mockup with floating Mascot */}
          <div className="method-visual-side">
            <div className="phone-mockup glass">
              <div className="phone-header">
                <span className="material-symbols-outlined phone-icon">arrow_back</span>
                <div className="phone-bar">
                  <div className="phone-progress-inner" style={{ width: '60%' }} />
                </div>
                <span className="material-symbols-outlined phone-icon">favorite</span>
              </div>
              <div className="phone-body">
                <h4 className="phone-title">{t('home.method_headline')}</h4>
                
                <div className="prompt-container">
                  <span className="material-symbols-outlined prompt-icon">volume_up</span>
                  <p className="prompt-phrase">The coffee is hot</p>
                </div>

                {/* Answer Area */}
                <div className="answer-container">
                  {selectedWords.map((word, idx) => (
                    <button 
                      key={idx} 
                      className="word-chip active animate-fade-in"
                      onClick={() => handleWordClick(word)}
                    >
                      {word}
                    </button>
                  ))}
                  {selectedWords.length === 0 && (
                    <span className="answer-placeholder">Chọn các từ để dịch...</span>
                  )}
                </div>

                {/* Chips Grid */}
                <div className="chips-grid">
                  {availableWords.map((word, idx) => {
                    const isSelected = selectedWords.includes(word);
                    return (
                      <button
                        key={idx}
                        className={`word-chip ${isSelected ? 'disabled' : ''}`}
                        onClick={() => !isSelected && handleWordClick(word)}
                        disabled={isSelected}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Features */}
          <div className="method-text-side">
            <h2 className="method-title">{t('home.method_title')}</h2>
            <p className="method-desc">{t('home.method_desc')}</p>

            <div className="method-features">
              <div className="method-feature">
                <span className="material-symbols-outlined method-feat-icon">psychology</span>
                <div>
                  <h3 className="method-feat-title">{t('home.method_feature1_title')}</h3>
                  <p className="method-feat-desc">{t('home.method_feature1_desc')}</p>
                </div>
              </div>
              
              <div className="method-feature">
                <span className="material-symbols-outlined method-feat-icon">analytics</span>
                <div>
                  <h3 className="method-feat-title">{t('home.method_feature2_title')}</h3>
                  <p className="method-feat-desc">{t('home.method_feature2_desc')}</p>
                </div>
              </div>

              <div className="method-feature">
                <span className="material-symbols-outlined method-feat-icon">military_tech</span>
                <div>
                  <h3 className="method-feat-title">{t('home.method_feature3_title')}</h3>
                  <p className="method-feat-desc">{t('home.method_feature3_desc')}</p>
                </div>
              </div>
            </div>

            <button className="btn-neon-cyan-outline uppercase">
              {t('home.method_cta')}
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta" id="cta-section">
        <div className="final-cta-inner container text-center">
          <h2 className="final-cta-title">{t('home.cta_ready')}</h2>
          <p className="final-cta-subtitle">{t('home.cta_ready_desc')}</p>
          <Link to="/stories" className="btn-neon-magenta-glow">
            {t('home.cta_ready_btn')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
