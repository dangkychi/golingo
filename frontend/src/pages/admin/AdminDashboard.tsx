import { useState, useEffect } from 'react';
import { adminAPI, type DashboardStats } from '../../api/admin';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI
      .getDashboard()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <h1 className="admin-page-title">Dashboard</h1>

      {loading ? (
        <p>Loading stats...</p>
      ) : stats ? (
        <div className="admin-stats-grid">
          <div className="admin-stat-card card">
            <div className="admin-stat-number">{stats.total_users}</div>
            <div className="admin-stat-label">Total Users</div>
          </div>
          <div className="admin-stat-card card">
            <div className="admin-stat-number">{stats.total_stories}</div>
            <div className="admin-stat-label">Total Stories</div>
          </div>
          <div className="admin-stat-card card">
            <div className="admin-stat-number">{stats.total_chapters}</div>
            <div className="admin-stat-label">Total Chapters</div>
          </div>
        </div>
      ) : (
        <p>Failed to load stats.</p>
      )}
    </div>
  );
}
