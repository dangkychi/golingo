import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storiesAPI, type Story, type Genre } from '../api/stories';
import './Stories.css';

type Difficulty = 'all' | 'beginner' | 'intermediate' | 'advanced';

const difficultyColors: Record<string, string> = {
  beginner: 'badge-success',
  intermediate: 'badge-warning',
  advanced: 'badge-primary',
};

export default function Stories() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('all');
  const [stories, setStories] = useState<Story[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  useEffect(() => {
    storiesAPI.getGenres().then(({ data }) => setGenres(data.genres || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    storiesAPI
      .list({
        search: search || undefined,
        difficulty: difficulty === 'all' ? undefined : difficulty,
        genre: selectedGenre || undefined,
        page,
        page_size: pageSize,
      })
      .then(({ data }) => {
        setStories(data.stories || []);
        setTotal(data.total);
      })
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [search, difficulty, selectedGenre, page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="page container animate-fade-in" id="stories-page">
      <div className="page-header">
        <h1 className="page-title">{t('stories.title')}</h1>
      </div>

      {/* Filters */}
      <div className="stories-filters" id="stories-filters">
        <input
          className="input stories-search"
          type="text"
          placeholder={t('stories.search_placeholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          id="stories-search"
        />
        <div className="difficulty-tabs">
          {(['all', 'beginner', 'intermediate', 'advanced'] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`difficulty-tab ${difficulty === d ? 'active' : ''}`}
              onClick={() => { setDifficulty(d); setPage(1); }}
            >
              {t(`stories.filter_${d}`)}
            </button>
          ))}
        </div>
        {genres.length > 0 && (
          <select
            className="input stories-genre-select"
            value={selectedGenre}
            onChange={(e) => { setSelectedGenre(e.target.value); setPage(1); }}
          >
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.slug}>{g.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="stories-loading">
          <p>Loading stories...</p>
        </div>
      )}

      {/* Story Grid */}
      {!loading && (
        <div className="stories-grid" id="stories-grid">
          {stories.map((story, i) => (
            <Link
              key={story.id}
              to={`/stories/${story.slug}`}
              className="story-card card animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="story-cover">
                {story.cover_url ? (
                  <img src={story.cover_url} alt={story.title} className="story-cover-img" />
                ) : (
                  <div className="story-cover-placeholder">
                    <span>📖</span>
                  </div>
                )}
              </div>
              <div className="story-info">
                <div className="story-meta">
                  <span className={`badge ${difficultyColors[story.difficulty]}`}>
                    {story.difficulty}
                  </span>
                </div>
                <h3 className="story-title">{story.title}</h3>
                {story.author && (
                  <p className="story-author">
                    {t('stories.by')} {story.author}
                  </p>
                )}
                {story.description && (
                  <p className="story-desc">{story.description}</p>
                )}
                <div className="story-genres">
                  {story.genres?.map((g) => (
                    <span key={g.id} className="genre-tag">{g.name}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && stories.length === 0 && (
        <div className="stories-empty">
          <p>No stories found matching your criteria.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="stories-pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
