import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { storiesAPI, type Genre } from '../../api/stories';
import { adminAPI } from '../../api/admin';

export default function AdminStoryForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [status, setStatus] = useState('ongoing');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    storiesAPI.getGenres().then(({ data }) => setGenres(data.genres || []));
  }, []);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      adminAPI
        .getStoryById(id)
        .then(({ data }) => {
          const s = data.story;
          setTitle(s.title);
          setDescription(s.description || '');
          setAuthor(s.author || '');
          setCoverUrl(s.cover_url || '');
          setDifficulty(s.difficulty);
          setStatus(s.status);
          setSelectedGenres(s.genres?.map((g) => g.id) || []);
        })
        .catch(() => setError('Failed to load story details'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title,
        description: description || undefined,
        cover_url: coverUrl || undefined,
        author: author || undefined,
        difficulty,
        status,
        genre_ids: selectedGenres.length > 0 ? selectedGenres : undefined,
      };

      if (isEditing && id) {
        await adminAPI.updateStory(id, payload);
      } else {
        await adminAPI.createStory(payload);
      }
      navigate('/admin/stories');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save story');
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  return (
    <div className="animate-fade-in">
      <h1 className="admin-page-title">{isEditing ? 'Edit Story' : 'Create New Story'}</h1>

      {error && <div className="auth-error">{error}</div>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter story title"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Author</label>
          <input
            className="input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author name"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the story"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Cover Image URL</label>
          <input
            className="input"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://example.com/cover.jpg"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Difficulty *</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Genres</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {genres.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`btn btn-xs ${selectedGenres.includes(g.id) ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => toggleGenre(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : isEditing ? 'Update Story' : 'Create Story'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/stories')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
