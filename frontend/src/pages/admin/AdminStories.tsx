import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storiesAPI, type Story } from '../../api/stories';
import { adminAPI } from '../../api/admin';

export default function AdminStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 15;

  const fetchStories = () => {
    setLoading(true);
    storiesAPI
      .list({ search: search || undefined, page, page_size: pageSize })
      .then(({ data }) => {
        setStories(data.stories || []);
        setTotal(data.total);
      })
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStories();
  }, [page, search]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This will also delete all its chapters.`)) return;
    try {
      await adminAPI.deleteStory(id);
      fetchStories();
    } catch {
      alert('Failed to delete story');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="animate-fade-in">
      <h1 className="admin-page-title">Manage Stories</h1>

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="Search stories..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Link to="/admin/stories/new" className="btn btn-primary">
          + New Story
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/admin/stories/${s.id}/edit`}>{s.title}</Link>
                    </td>
                    <td>{s.author || '—'}</td>
                    <td>
                      <span className={`badge ${
                        s.difficulty === 'beginner' ? 'badge-success' :
                        s.difficulty === 'intermediate' ? 'badge-warning' : 'badge-primary'
                      }`}>
                        {s.difficulty}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{s.status}</td>
                    <td>
                      <div className="admin-actions">
                        <Link to={`/admin/stories/${s.id}/edit`} className="btn btn-ghost btn-xs">
                          Edit
                        </Link>
                        <Link to={`/admin/stories/${s.id}/chapters`} className="btn btn-ghost btn-xs">
                          Chapters
                        </Link>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => handleDelete(s.id, s.title)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {stories.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No stories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                ← Prev
              </button>
              <span className="pagination-info">Page {page} / {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
