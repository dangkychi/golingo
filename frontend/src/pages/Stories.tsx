import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import './Stories.css';

// Mock data for now — will be replaced with API calls
const mockStories = [
  {
    id: '1',
    title: 'The Little Prince',
    author: 'Antoine de Saint-Exupéry',
    slug: 'the-little-prince',
    description: 'A pilot stranded in the desert meets a young prince who has fallen to Earth from a tiny asteroid.',
    difficulty: 'beginner',
    cover_url: null,
    chapters: 12,
    genres: ['Fiction', 'Fantasy'],
  },
  {
    id: '2',
    title: 'Sherlock Holmes: A Study in Scarlet',
    author: 'Arthur Conan Doyle',
    slug: 'sherlock-holmes-study-in-scarlet',
    description: 'Dr. Watson meets Sherlock Holmes and they investigate a mysterious murder together.',
    difficulty: 'intermediate',
    cover_url: null,
    chapters: 14,
    genres: ['Mystery', 'Fiction'],
  },
  {
    id: '3',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    slug: 'the-great-gatsby',
    description: 'A mysterious millionaire and his obsessive love story set in the Jazz Age of 1920s America.',
    difficulty: 'advanced',
    cover_url: null,
    chapters: 9,
    genres: ['Fiction', 'Romance'],
  },
  {
    id: '4',
    title: 'Alice in Wonderland',
    author: 'Lewis Carroll',
    slug: 'alice-in-wonderland',
    description: 'Alice falls through a rabbit hole into a fantastical underground world.',
    difficulty: 'beginner',
    cover_url: null,
    chapters: 12,
    genres: ['Fantasy', 'Children'],
  },
  {
    id: '5',
    title: '1984',
    author: 'George Orwell',
    slug: '1984',
    description: 'A dystopian novel set in a totalitarian society ruled by Big Brother.',
    difficulty: 'advanced',
    cover_url: null,
    chapters: 23,
    genres: ['Science Fiction', 'Fiction'],
  },
  {
    id: '6',
    title: 'The Old Man and the Sea',
    author: 'Ernest Hemingway',
    slug: 'the-old-man-and-the-sea',
    description: 'An aging fisherman struggles with a giant marlin far out in the Gulf Stream.',
    difficulty: 'intermediate',
    cover_url: null,
    chapters: 1,
    genres: ['Fiction', 'Adventure'],
  },
];

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

  const filtered = mockStories.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.author.toLowerCase().includes(search.toLowerCase());
    const matchDiff = difficulty === 'all' || s.difficulty === difficulty;
    return matchSearch && matchDiff;
  });

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
          onChange={(e) => setSearch(e.target.value)}
          id="stories-search"
        />
        <div className="difficulty-tabs">
          {(['all', 'beginner', 'intermediate', 'advanced'] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`difficulty-tab ${difficulty === d ? 'active' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {t(`stories.filter_${d}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Story Grid */}
      <div className="stories-grid" id="stories-grid">
        {filtered.map((story, i) => (
          <article
            key={story.id}
            className="story-card card animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="story-cover">
              <div className="story-cover-placeholder">
                <span>📖</span>
              </div>
            </div>
            <div className="story-info">
              <div className="story-meta">
                <span className={`badge ${difficultyColors[story.difficulty]}`}>
                  {story.difficulty}
                </span>
                <span className="story-chapters">
                  {story.chapters} {t('stories.chapters')}
                </span>
              </div>
              <h3 className="story-title">{story.title}</h3>
              <p className="story-author">
                {t('stories.by')} {story.author}
              </p>
              <p className="story-desc">{story.description}</p>
              <div className="story-genres">
                {story.genres.map((g) => (
                  <span key={g} className="genre-tag">{g}</span>
                ))}
              </div>
              <button className="btn btn-primary story-read-btn">
                {t('stories.read_now')}
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="stories-empty">
          <p>No stories found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
