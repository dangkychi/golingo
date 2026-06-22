import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { storiesAPI, type Chapter } from '../api/stories';
import './ChapterReader.css';

export default function ChapterReader() {
  const { slug, num } = useParams<{ slug: string; num: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [storyInfo, setStoryInfo] = useState<{ title: string; slug: string } | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);

  const chapterNum = parseInt(num || '1', 10);

  useEffect(() => {
    if (!slug || !num) return;
    setLoading(true);
    window.scrollTo(0, 0);

    storiesAPI
      .getChapter(slug, chapterNum)
      .then(({ data }) => {
        setChapter(data.chapter);
        setStoryInfo(data.story);
        setTotalChapters(data.total_chapters);
      })
      .catch(() => setChapter(null))
      .finally(() => setLoading(false));
  }, [slug, num, chapterNum]);

  if (loading) {
    return (
      <div className="reader-page">
        <div className="reader-container">
          <p>Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapter || !storyInfo) {
    return (
      <div className="reader-page">
        <div className="reader-container">
          <h2>Chapter not found</h2>
          <Link to={`/stories/${slug}`} className="btn btn-ghost">← Back to Story</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-page">
      {/* Reader Header */}
      <div className="reader-header">
        <div className="reader-header-inner">
          <Link to={`/stories/${slug}`} className="reader-back">
            ← {storyInfo.title}
          </Link>
          <span className="reader-progress">
            Chapter {chapterNum} of {totalChapters}
          </span>
        </div>
      </div>

      {/* Reader Content */}
      <article className="reader-container">
        <header className="reader-chapter-header">
          <h1 className="reader-chapter-title">
            {chapter.title || `Chapter ${chapterNum}`}
          </h1>
          <p className="reader-word-count">
            {chapter.word_count?.toLocaleString()} words
          </p>
        </header>

        <div className="reader-content">
          {chapter.content?.split('\n').map((paragraph, i) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;
            return <p key={i}>{trimmed}</p>;
          })}
        </div>
      </article>

      {/* Navigation */}
      <nav className="reader-nav">
        <button
          className="btn btn-ghost"
          disabled={chapterNum <= 1}
          onClick={() => navigate(`/stories/${slug}/chapters/${chapterNum - 1}`)}
        >
          ← Previous Chapter
        </button>
        <Link to={`/stories/${slug}`} className="btn btn-ghost">
          📚 All Chapters
        </Link>
        <button
          className="btn btn-ghost"
          disabled={chapterNum >= totalChapters}
          onClick={() => navigate(`/stories/${slug}/chapters/${chapterNum + 1}`)}
        >
          Next Chapter →
        </button>
      </nav>
    </div>
  );
}
