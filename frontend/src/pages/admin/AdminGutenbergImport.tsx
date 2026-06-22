import { useState, useEffect } from 'react';
import { adminAPI, type GutenbergBook } from '../../api/admin';
import { storiesAPI, type Genre } from '../../api/stories';

export default function AdminGutenbergImport() {
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState<GutenbergBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  // Import Dialog State
  const [selectedBook, setSelectedBook] = useState<GutenbergBook | null>(null);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

  useEffect(() => {
    storiesAPI.getGenres().then(({ data }) => setGenres(data.genres || []));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setPage(1);
    fetchBooks(1);
  };

  const fetchBooks = (pageNum: number) => {
    setLoading(true);
    setError('');
    adminAPI
      .searchGutenberg(search, pageNum)
      .then(({ data }) => {
        setBooks(data.results || []);
        setCount(data.count);
      })
      .catch(() => setError('Failed to search Gutenberg books.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (search.trim()) {
      fetchBooks(page);
    }
  }, [page]);

  const handleOpenImport = (book: GutenbergBook) => {
    setSelectedBook(book);
    setDifficulty('intermediate');
    setSelectedGenres([]);
    setImportSuccess('');
    setError('');
  };

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  const handleImport = async () => {
    if (!selectedBook) return;
    setImporting(true);
    setError('');
    setImportSuccess('');

    try {
      const res = await adminAPI.importGutenberg({
        gutenberg_id: selectedBook.id,
        difficulty,
        genre_ids: selectedGenres.length > 0 ? selectedGenres : undefined,
      });
      const actionText = selectedBook.imported ? 'synced' : 'imported';
      setImportSuccess(`Successfully ${actionText} "${res.data.story.title}"!`);
      
      // Update local book status
      setBooks((prev) =>
        prev.map((b) => (b.id === selectedBook.id ? { ...b, imported: true } : b))
      );
      
      setSelectedBook(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to import book');
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.ceil(count / 32); // Gutendex returns 32 items per page

  return (
    <div className="animate-fade-in">
      <h1 className="admin-page-title">Import from Gutenberg</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: 'var(--text-sm)' }}>
        Search the Gutenberg catalog for public domain English books, and import them with auto-generated chapters.
      </p>

      <form onSubmit={handleSearch} className="admin-toolbar" style={{ display: 'flex', gap: '1rem' }}>
        <input
          className="input"
          placeholder="e.g. Alice in Wonderland..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="auth-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {importSuccess && (
        <div className="auth-error" style={{ background: 'rgba(0, 230, 118, 0.1)', borderColor: 'var(--neon-green)', color: 'var(--neon-green)', marginBottom: '1.5rem' }}>
          {importSuccess}
        </div>
      )}

      {/* Import Config Dialog */}
      {selectedBook && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--neon-cyan)' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', marginBottom: '1rem' }}>
            Import: {selectedBook.title}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Author: {selectedBook.authors?.map((a) => a.name).join(', ') || 'Unknown'}
          </p>

          <div className="admin-form">
            <div className="form-group">
              <label className="form-label">Assign Difficulty *</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assign Genres</label>
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
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing (Downloading text & splitting chapters)...' : 'Start Import'}
              </button>
              <button className="btn btn-ghost" onClick={() => setSelectedBook(null)} disabled={importing}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {loading ? (
        <p>Searching Project Gutenberg...</p>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>ID</th>
                  <th>Formats</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.title}</td>
                    <td>{b.authors?.map((a) => a.name).join(', ') || 'Unknown'}</td>
                    <td>{b.id}</td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {Object.keys(b.formats).length} formats available
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {b.imported && (
                          <span className="badge badge-success" style={{ background: 'rgba(0, 230, 118, 0.1)', borderColor: 'var(--neon-green)', color: 'var(--neon-green)', borderWidth: '1px', borderStyle: 'solid' }}>
                            Imported
                          </span>
                        )}
                        <button
                          className={`btn btn-xs ${b.imported ? 'btn-ghost' : 'btn-primary'}`}
                          onClick={() => handleOpenImport(b)}
                          style={b.imported ? { color: 'var(--neon-yellow)', borderColor: 'var(--neon-yellow)' } : {}}
                        >
                          {b.imported ? 'Sync 🔄' : 'Import'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {books.length === 0 && search && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No books found. Try another search query.
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
              <span className="pagination-info">Page {page} / {totalPages} (Total: {count} books)</span>
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
