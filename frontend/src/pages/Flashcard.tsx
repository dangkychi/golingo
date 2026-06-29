import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { flashcardAPI } from '../api/flashcard';
import type { VocabularyItem } from '../api/vocabulary';
import './Flashcard.css';

export default function Flashcard() {
  const { t } = useTranslation();
  const [cards, setCards] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [ratingsCount, setRatingsCount] = useState<Record<number, number>>({ 0: 0, 3: 0, 4: 0, 5: 0 });

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    setLoading(true);
    try {
      const response = await flashcardAPI.getSession();
      setCards(response.data || []);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error('Failed to load flashcard session', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    if (transitioning) return;
    setIsFlipped(!isFlipped);
  };

  const handleRate = async (quality: number) => {
    if (transitioning || currentIndex >= cards.length) return;

    const currentCard = cards[currentIndex];
    
    // Add to local count for summary
    setRatingsCount((prev) => ({
      ...prev,
      [quality]: prev[quality] + 1,
    }));

    // Trigger slide out animation
    setTransitioning(true);

    // Call API in background
    try {
      await flashcardAPI.submitReview(currentCard.id, quality);
    } catch (err) {
      console.error('Failed to submit review for card ' + currentCard.id, err);
    }

    // Wait for slide animation (300ms) then change card
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setTransitioning(false);
    }, 300);
  };

  const handlePrevCard = () => {
    if (transitioning || currentIndex === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => prev - 1);
  };

  const handleNextCard = () => {
    if (transitioning) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || cards.length === 0 || currentIndex >= cards.length) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowLeft') {
        handlePrevCard();
      } else if (e.key === 'ArrowRight') {
        handleNextCard();
      } else if (isFlipped) {
        if (e.key === '1') handleRate(0);
        else if (e.key === '2') handleRate(3);
        else if (e.key === '3') handleRate(4);
        else if (e.key === '4') handleRate(5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, cards, loading, transitioning]);

  if (loading) {
    return (
      <div className="flashcard-page flex-center">
        <div className="flash-loading-container">
          <div className="flash-spinner"></div>
          <p className="loading-text">{t('flashcard.loading', 'Loading your review session...')}</p>
        </div>
      </div>
    );
  }

  // Session completed or empty from start
  if (cards.length === 0 || currentIndex >= cards.length) {
    const totalReviewed = ratingsCount[0] + ratingsCount[3] + ratingsCount[4] + ratingsCount[5];
    const hasCards = cards.length > 0;

    return (
      <div className="flashcard-page flex-center">
        <div className="flash-summary-card neon-glow-magenta">
          <div className="summary-icon">🎉</div>
          <h2 className="summary-title">
            {hasCards ? t('flashcard.completed_title', 'Session Completed!') : t('flashcard.no_due_title', 'All Caught Up!')}
          </h2>
          <p className="summary-desc">
            {hasCards
              ? totalReviewed > 0
                ? t('flashcard.completed_desc', 'You have successfully reviewed all active flashcards in this session.')
                : t('flashcard.browse_completed_desc', 'You have finished browsing the flashcards in this session.')
              : t('flashcard.no_due_desc', 'You have no due flashcards to review right now. Keep reading to save more words!')}
          </p>

          {hasCards && (
            <div className="summary-stats">
              <div className="stat-row">
                <span className="stat-label">😵 {t('flashcard.forgot', 'Forgot')}:</span>
                <span className="stat-value text-forgot">{ratingsCount[0]}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">😐 {t('flashcard.hard', 'Hard')}:</span>
                <span className="stat-value text-hard">{ratingsCount[3]}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">🙂 {t('flashcard.good', 'Good')}:</span>
                <span className="stat-value text-good">{ratingsCount[4]}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">😎 {t('flashcard.easy', 'Easy')}:</span>
                <span className="stat-value text-easy">{ratingsCount[5]}</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-row total">
                <span className="stat-label">{t('flashcard.total_reviewed', 'Total Reviewed')}:</span>
                <span className="stat-value">{totalReviewed}</span>
              </div>
            </div>
          )}

          <div className="summary-actions">
            {hasCards ? (
              <button className="btn btn-neon-cyan" onClick={loadSession}>
                {t('flashcard.review_again', 'Review Again')}
              </button>
            ) : (
              <Link to="/stories" className="btn btn-neon-cyan">
                {t('flashcard.go_to_stories', 'Browse Stories')}
              </Link>
            )}
            <Link to="/dashboard" className="btn btn-secondary">
              {t('flashcard.view_dashboard', 'View Dashboard')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = ((currentIndex) / cards.length) * 100;

  return (
    <div className="flashcard-page">
      <div className="flash-container">
        {/* Progress Bar Header */}
        <div className="flash-progress-wrapper">
          <div className="progress-text">
            <span>{t('flashcard.card_progress', { defaultValue: 'Card {{current}} of {{total}}', current: currentIndex + 1, total: cards.length })}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        {/* Card Stage with Navigation Arrows */}
        <div className="flash-stage-container">
          <button 
            className="nav-arrow-btn prev-btn" 
            onClick={handlePrevCard} 
            disabled={currentIndex === 0}
            title={t('flashcard.prev_card', 'Previous Card')}
          >
            ‹
          </button>

          <div className={`flash-card-stage ${transitioning ? 'slide-out' : ''}`}>
            <div className={`flash-card-3d ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
              {/* Front Side */}
              <div className="card-side front neon-glow-cyan">
                <span className="badge-side">{t('flashcard.front_hint', 'FRONT')}</span>
                <div className="card-front-content">
                  <h1 className="flash-word">{currentCard.word}</h1>
                  {currentCard.entry?.phonetic && (
                    <p className="flash-phonetic">/{currentCard.entry.phonetic}/</p>
                  )}
                  <div className="flash-selected-context">
                    <p className="context-label">{t('flashcard.context_label', 'Context Sentence')}:</p>
                    <p className="context-content">
                      "{currentCard.selected_text || currentCard.context_sentence}"
                    </p>
                  </div>
                </div>
                <div className="card-footer-hint">
                  <span className="hint-icon">🖱️</span> {t('flashcard.tap_to_flip', 'Tap to reveal meaning')}
                </div>
              </div>

              {/* Back Side */}
              <div className="card-side back neon-glow-magenta">
                <span className="badge-side">{t('flashcard.back_hint', 'BACK')}</span>
                <div className="card-back-content">
                  <div className="back-item">
                    <span className="back-label">{t('flashcard.translation_label', 'Translation')}:</span>
                    <h2 className="back-translation">{currentCard.translation}</h2>
                  </div>

                  {(currentCard.context_sentence || currentCard.entry?.definition) && (
                    <div className="back-item">
                      <span className="back-label">{t('flashcard.definition_label', 'Definition')}:</span>
                      <p className="back-desc">
                        {currentCard.entry?.definition || currentCard.context_sentence}
                      </p>
                    </div>
                  )}

                  {currentCard.user_note && (
                    <div className="back-item note-box">
                      <span className="back-label">{t('flashcard.note_label', 'Your Note')}:</span>
                      <p className="back-note">{currentCard.user_note}</p>
                    </div>
                  )}
                </div>
                <div className="card-footer-hint">
                  <span className="hint-icon">🖱️</span> {t('flashcard.tap_to_flip_back', 'Tap to show front')}
                </div>
              </div>
            </div>
          </div>

          <button 
            className="nav-arrow-btn next-btn" 
            onClick={handleNextCard}
            title={t('flashcard.next_card', 'Next Card')}
          >
            ›
          </button>
        </div>

        {/* Rating Actions Panel */}
        <div className={`flash-rating-panel ${isFlipped ? 'visible' : ''}`}>
          <p className="rating-instruction">
            {t('flashcard.rate_instruction', 'How well did you remember this word?')}
          </p>
          <div className="rating-buttons">
            <button className="btn-rate forgot" onClick={() => handleRate(0)}>
              <span className="rate-emoji">😵</span>
              <span className="rate-name">{t('flashcard.forgot', 'Forgot')}</span>
              <span className="key-hint">1</span>
            </button>
            <button className="btn-rate hard" onClick={() => handleRate(3)}>
              <span className="rate-emoji">😐</span>
              <span className="rate-name">{t('flashcard.hard', 'Hard')}</span>
              <span className="key-hint">2</span>
            </button>
            <button className="btn-rate good" onClick={() => handleRate(4)}>
              <span className="rate-emoji">🙂</span>
              <span className="rate-name">{t('flashcard.good', 'Good')}</span>
              <span className="key-hint">3</span>
            </button>
            <button className="btn-rate easy" onClick={() => handleRate(5)}>
              <span className="rate-emoji">😎</span>
              <span className="rate-name">{t('flashcard.easy', 'Easy')}</span>
              <span className="key-hint">4</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
