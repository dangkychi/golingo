import { useState, useEffect } from 'react';
import { adminAPI, type AdminUser } from '../../api/admin';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 15;

  const fetchUsers = () => {
    setLoading(true);
    adminAPI
      .getUsers({ search: search || undefined, page, page_size: pageSize })
      .then(({ data }) => {
        setUsers(data.users || []);
        setTotal(data.total);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleToggleBan = async (id: string, username: string, currentStatus: boolean) => {
    const action = currentStatus ? 'Ban' : 'Unban';
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} user "${username}"?`)) return;
    
    try {
      await adminAPI.toggleBanUser(id);
      fetchUsers();
    } catch {
      alert(`Failed to ${action.toLowerCase()} user`);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="animate-fade-in">
      <h1 className="admin-page-title">Manage Users</h1>

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.username}
                            style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                          />
                        ) : (
                          <span style={{ fontSize: '1.2rem' }}>👤</span>
                        )}
                        <span>{u.username}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${
                        u.role === 'admin' ? 'badge-primary' :
                        u.role === 'editor' ? 'badge-warning' : 'badge-ghost'
                      }`} style={{ textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className={`btn btn-xs ${u.is_active ? 'btn-danger' : 'btn-primary'}`}
                        disabled={u.role === 'admin'} // Cannot ban admin from web UI
                        onClick={() => handleToggleBan(u.id, u.username, u.is_active)}
                      >
                        {u.is_active ? 'Ban' : 'Unban'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No users found.
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
