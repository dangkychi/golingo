import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storiesAPI, type Story, type Chapter } from '../../api/stories';
import { adminAPI } from '../../api/admin';

export default function AdminChapters() {
  const { storyId } = useParams<{ storyId: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chapter Form States
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchStoryAndChapters = async () => {
    if (!storyId) return;
    setLoading(true);
    try {
      const storyRes = await adminAPI.getStoryById(storyId);
      setStory(storyRes.data.story);
      
      const chaptersRes = await storiesAPI.getChapters(storyRes.data.story.slug);
      setChapters(chaptersRes.data.chapters || []);
    } catch {
      setError('Failed to load story details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoryAndChapters();
  }, [storyId]);

  const handleSelectChapter = (ch: Chapter) => {
    setSelectedChapter(ch);
    setIsEditing(true);
    setTitle(ch.title || '');
    // Fetch chapter detail to get content (list endpoint doesn't return full content)
    if (story) {
      storiesAPI.getChapter(story.slug, ch.chapter_num).then(({ data }) => {
        setContent(data.chapter.content || '');
      });
    }
  };

  const handleNewChapter = () => {
    setSelectedChapter(null);
    setIsEditing(false);
    setTitle('');
    setContent('');
    setError('');
  };

  const handleDelete = async (chId: string, chNum: number) => {
    if (!confirm(`Are you sure you want to delete Chapter ${chNum}?`)) return;
    try {
      await adminAPI.deleteChapter(chId);
      if (selectedChapter?.id === chId) {
        handleNewChapter();
      }
      fetchStoryAndChapters();
    } catch {
      alert('Failed to delete chapter');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    if (!storyId) return;

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title: title || undefined,
        content,
      };

      if (isEditing && selectedChapter) {
        await adminAPI.updateChapter(selectedChapter.id, payload);
      } else {
        await adminAPI.createChapter(storyId, payload);
      }
      
      handleNewChapter();
      fetchStoryAndChapters();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save chapter');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <p>Loading story and chapters...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="animate-fade-in">
        <h2>Story not found</h2>
        <Link to="/admin/stories" className="btn btn-ghost">← Back to Stories</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link to="/admin/stories" className="back-link">← Back to Stories</Link>
      <h1 className="admin-page-title">{story.title} — Chapters</h1>

      {error && <div className="auth-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Chapters List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)' }}>Chapter List</h2>
            <button className="btn btn-ghost btn-xs" onClick={handleNewChapter}>
              + Add Chapter
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className={`card ${selectedChapter?.id === ch.id ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  cursor: 'pointer',
                  borderColor: selectedChapter?.id === ch.id ? 'var(--neon-cyan)' : 'var(--border-secondary)',
                }}
                onClick={() => handleSelectChapter(ch)}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Ch. {ch.chapter_num}: {ch.title || 'Untitled'}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {ch.word_count.toLocaleString()} words
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(ch.id, ch.chapter_num);
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            {chapters.length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                No chapters added yet. Use the form on the right to add the first chapter.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', marginBottom: '1.5rem' }}>
            {isEditing ? `Edit Chapter ${selectedChapter?.chapter_num}` : 'Add New Chapter'}
          </h2>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Chapter Title</label>
              <input
                className="input"
                placeholder="e.g. A Mad Tea-Party"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Content *</label>
              <textarea
                placeholder="Paste chapter text here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ minHeight: '300px' }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : isEditing ? 'Update Chapter' : 'Add Chapter'}
              </button>
              {isEditing && (
                <button type="button" className="btn btn-ghost" onClick={handleNewChapter}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
