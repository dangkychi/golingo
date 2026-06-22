import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './AdminLayout.css';

export default function AdminLayout() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'editor')) {
    return <Navigate to="/" replace />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar glass">
        <div className="admin-sidebar-header">
          <h2 className="admin-sidebar-title">Admin Panel</h2>
          <span className="admin-role-badge badge badge-primary">{user.role}</span>
        </div>
        <nav className="admin-nav">
          {isAdmin && (
            <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <span className="admin-nav-icon">📊</span>
              Dashboard
            </NavLink>
          )}
          <NavLink to="/admin/stories" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <span className="admin-nav-icon">📚</span>
            Stories
          </NavLink>
          <NavLink to="/admin/gutenberg" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <span className="admin-nav-icon">🌐</span>
            Import Gutenberg
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <span className="admin-nav-icon">👥</span>
              Users
            </NavLink>
          )}
        </nav>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
