import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { storiesAPI, type Story, type Chapter } from '../api/stories';
import './StoryDetail.css';

const difficultyColors: Record<string, string> = {
  beginner: 'badge-success',
  intermediate: 'badge-warning',
  advanced: 'badge-primary',
};

export default function StoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    Promise.all([
      storiesAPI.getBySlug(slug),
      storiesAPI.getChapters(slug),
    ])
      .then(([storyRes, chaptersRes]) => {
        setStory(storyRes.data.story);
        setChapters(chaptersRes.data.chapters || []);
      })
      .catch(() => setStory(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="page container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="page container">
        <h2>Story not found</h2>
        <Link to="/stories" className="btn btn-ghost">← Back to Stories</Link>
      </div>
    );
  }

  return (
    <div className="page container animate-fade-in" id="story-detail-page">
      <Link to="/stories" className="back-link">← Back to Stories</Link>

      <div className="story-detail-header">
        <div className="story-detail-cover">
          {story.cover_url ? (
            <img src={story.cover_url} alt={story.title} />
          ) : (
            <div className="story-detail-cover-placeholder">📖</div>
          )}
        </div>
        <div className="story-detail-info">
          <div className="story-detail-badges">
            <span className={`badge ${difficultyColors[story.difficulty]}`}>
              {story.difficulty}
            </span>
            <span className="badge badge-outline">{story.status}</span>
          </div>
          <h1 className="story-detail-title">{story.title}</h1>
          {story.author && (
            <p className="story-detail-author">by {story.author}</p>
          )}
          {story.description && (
            <p className="story-detail-desc">{story.description}</p>
          )}
          <div className="story-detail-genres">
            {story.genres?.map((g) => (
              <span key={g.id} className="genre-tag">{g.name}</span>
            ))}
          </div>
          <p className="story-detail-stats">
            {chapters.length} {t('stories.chapters')} • {chapters.reduce((sum, c) => sum + c.word_count, 0).toLocaleString()} words
          </p>
        </div>
      </div>

      {/* Chapters List */}
      <div className="chapters-section">
        <h2>Chapters</h2>
        {chapters.length === 0 ? (
          <p className="chapters-empty">No chapters available yet.</p>
        ) : (
          <div className="chapters-list">
            {chapters.map((ch) => (
              <Link
                key={ch.id}
                to={`/stories/${slug}/chapters/${ch.chapter_num}`}
                className="chapter-item card"
              >
                <div className="chapter-num">Ch. {ch.chapter_num}</div>
                <div className="chapter-info">
                  <h3 className="chapter-title">
                    {ch.title || `Chapter ${ch.chapter_num}`}
                  </h3>
                  <span className="chapter-words">
                    {ch.word_count.toLocaleString()} words
                  </span>
                </div>
                <span className="chapter-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
