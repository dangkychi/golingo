import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { progressAPI, type LearningOverview } from '../api/progress';
import './Dashboard.css';

export default function Dashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LearningOverview | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const tzOffset = -new Date().getTimezoneOffset();
      const response = await progressAPI.getOverview(tzOffset);
      setData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render heatmap grid days
  const renderHeatmap = () => {
    if (!data || !data.heatmap) return null;

    const today = new Date();
    // 364 days ago
    const start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    // Align to Sunday
    const startDate = new Date(start);
    startDate.setDate(start.getDate() - start.getDay());

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    const tempDate = new Date(startDate);

    // We build 53 columns (weeks) of 7 days
    while (tempDate <= today || weeks.length < 53) {
      currentWeek.push(new Date(tempDate));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
    if (currentWeek.length > 0) {
      // pad rest of the week if necessary
      while (currentWeek.length < 7) {
        currentWeek.push(new Date(tempDate));
        tempDate.setDate(tempDate.getDate() + 1);
      }
      weeks.push(currentWeek);
    }

    return (
      <div className="heatmap-scroll-container">
        <div className="heatmap-grid">
          {/* Weekday indicators */}
          <div className="heatmap-weekdays">
            <span>{t('dashboard.sun', 'Sun')}</span>
            <span>{t('dashboard.tue', 'Tue')}</span>
            <span>{t('dashboard.thu', 'Thu')}</span>
            <span>{t('dashboard.sat', 'Sat')}</span>
          </div>

          <div className="heatmap-columns">
            {weeks.map((week, wIndex) => (
              <div key={wIndex} className="heatmap-column">
                {week.map((day, dIndex) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const count = data.heatmap[dateStr] || 0;
                  
                  // Color intensity classification
                  let colorClass = 'intensity-0';
                  if (count > 0 && count <= 5) colorClass = 'intensity-1';
                  else if (count > 5 && count <= 15) colorClass = 'intensity-2';
                  else if (count > 15) colorClass = 'intensity-3';

                  const formattedDate = day.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={dIndex}
                      className={`heatmap-day-cell ${colorClass}`}
                      title={`${count} ${t('dashboard.activities_on', 'activities on')} ${formattedDate}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="heatmap-legend">
          <span>{t('dashboard.less', 'Less')}</span>
          <div className="legend-cell intensity-0"></div>
          <div className="legend-cell intensity-1"></div>
          <div className="legend-cell intensity-2"></div>
          <div className="legend-cell intensity-3"></div>
          <span>{t('dashboard.more', 'More')}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-page flex-center">
        <div className="dash-loading-container">
          <div className="dash-spinner"></div>
          <p className="loading-text">{t('dashboard.loading', 'Loading your learning insights...')}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-page flex-center">
        <div className="dash-error-card">
          <p>{t('dashboard.load_error', 'Failed to retrieve learning data.')}</p>
          <button className="btn btn-neon-cyan" onClick={loadDashboardData}>
            {t('dashboard.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  const { streak, vocab_stats, reading_progress } = data;
  const vocabTotal = vocab_stats.total || 0;
  const newPercent = vocabTotal > 0 ? Math.round((vocab_stats.new / vocabTotal) * 100) : 0;
  const learningPercent = vocabTotal > 0 ? Math.round((vocab_stats.learning / vocabTotal) * 100) : 0;
  const masteredPercent = vocabTotal > 0 ? Math.round((vocab_stats.mastered / vocabTotal) * 100) : 0;

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">{t('dashboard.title', 'Learning Center')}</h1>
            <p className="dashboard-subtitle">
              {t('dashboard.subtitle', 'Track your reading progress, streaks, and review cycles.')}
            </p>
          </div>
          <Link to="/flashcard" className="btn btn-neon-magenta btn-flash-glow">
            ⚡ {t('dashboard.start_flashcards', 'Start Flashcards')}
          </Link>
        </div>

        {/* Bento Grid Layout */}
        <div className="bento-grid">
          {/* Card 1: Streak */}
          <div className="bento-card bento-streak neon-glow-orange animate-scale-up">
            <div className="card-header">
              <span className="card-icon">🔥</span>
              <h3 className="card-title">{t('dashboard.streak_title', 'Daily Streak')}</h3>
            </div>
            <div className="streak-content">
              <span className="streak-number">{streak}</span>
              <span className="streak-unit">{t('dashboard.days', 'Days')}</span>
            </div>
            <p className="streak-hint">
              {streak > 0 
                ? t('dashboard.streak_active', 'Keep the flame burning! Read or review today.')
                : t('dashboard.streak_inactive', 'Start a new streak today by reviewing words!')}
            </p>
          </div>

          {/* Card 2: Vocabulary Breakdown */}
          <div className="bento-card bento-vocab-breakdown neon-glow-cyan animate-scale-up">
            <div className="card-header">
              <span className="card-icon">📊</span>
              <h3 className="card-title">{t('dashboard.vocab_mastery', 'Vocabulary Progress')}</h3>
            </div>
            <div className="vocab-stats-summary">
              <div className="total-vocab-number">
                <span>{vocabTotal}</span>
                <span className="total-label">{t('dashboard.saved_words', 'Saved Words')}</span>
              </div>
            </div>

            {vocabTotal > 0 ? (
              <div className="progress-stack-container">
                {/* Horizontal percentage stacked bar */}
                <div className="progress-stacked-bar">
                  <div 
                    className="stacked-segment segment-mastered" 
                    style={{ width: `${masteredPercent}%` }}
                    title={`Mastered: ${masteredPercent}%`}
                  />
                  <div 
                    className="stacked-segment segment-learning" 
                    style={{ width: `${learningPercent}%` }}
                    title={`Learning: ${learningPercent}%`}
                  />
                  <div 
                    className="stacked-segment segment-new" 
                    style={{ width: `${newPercent}%` }}
                    title={`New: ${newPercent}%`}
                  />
                </div>
                {/* Labels legend */}
                <div className="legend-items">
                  <div className="legend-item">
                    <span className="dot dot-mastered"></span>
                    <span className="legend-lbl">{t('dashboard.mastered', 'Mastered')}</span>
                    <span className="legend-pct">{vocab_stats.mastered} ({masteredPercent}%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="dot dot-learning"></span>
                    <span className="legend-lbl">{t('dashboard.learning', 'Learning')}</span>
                    <span className="legend-pct">{vocab_stats.learning} ({learningPercent}%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="dot dot-new"></span>
                    <span className="legend-lbl">{t('dashboard.new', 'New')}</span>
                    <span className="legend-pct">{vocab_stats.new} ({newPercent}%)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-vocab-stats">
                <p>{t('dashboard.no_vocab', 'You haven\'t saved any vocabulary items yet. Highlight words while reading to save them!')}</p>
              </div>
            )}
          </div>

          {/* Card 3: Activity Heatmap (Spans full width on small/medium screens, takes larger block) */}
          <div className="bento-card bento-heatmap neon-glow-cyan span-2">
            <div className="card-header">
              <span className="card-icon">📅</span>
              <h3 className="card-title">{t('dashboard.study_activity', 'Study Map')}</h3>
            </div>
            {renderHeatmap()}
          </div>

          {/* Card 4: Stories in Progress */}
          <div className="bento-card bento-stories-progress neon-glow-magenta span-2 animate-scale-up">
            <div className="card-header">
              <span className="card-icon">📖</span>
              <h3 className="card-title">{t('dashboard.stories_progress', 'Reading Continuation')}</h3>
            </div>

            {reading_progress.length > 0 ? (
              <div className="dashboard-stories-list">
                {reading_progress.slice(0, 3).map((progress) => {
                  const percentage = progress.total_chapters > 0 
                    ? Math.round((progress.last_read_chapter_num / progress.total_chapters) * 100)
                    : 0;

                  return (
                    <div key={progress.story_id} className="dash-story-row">
                      <div className="dash-story-cover">
                        {progress.story_cover_url ? (
                          <img src={progress.story_cover_url} alt={progress.story_title} />
                        ) : (
                          <div className="dash-story-placeholder">📖</div>
                        )}
                      </div>
                      <div className="dash-story-details">
                        <div className="dash-story-meta">
                          <h4 className="dash-story-title">{progress.story_title}</h4>
                          <span className="dash-story-percent">{percentage}%</span>
                        </div>
                        <p className="dash-story-chapter-title">
                          {t('dashboard.last_read_chapter', { defaultValue: 'Chapter {{num}}', num: progress.last_read_chapter_num })}
                          {progress.last_read_chapter_title ? `: ${progress.last_read_chapter_title}` : ''}
                        </p>
                        
                        <div className="dash-story-progress-bar-bg">
                          <div className="dash-story-progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                      <Link 
                        to={`/stories/${progress.story_slug}/chapters/${progress.last_read_chapter_num}`}
                        className="btn-continue-read"
                        title={t('dashboard.continue_reading', 'Continue Reading')}
                      >
                        ⚡
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-stories-progress">
                <p>{t('dashboard.no_progress', 'No reading progress found yet. Dive into some stories to track your speed!')}</p>
                <Link to="/stories" className="btn btn-neon-cyan">
                  {t('dashboard.browse_stories', 'Browse Stories')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
