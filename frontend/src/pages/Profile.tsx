import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import './Auth.css';
import './Profile.css';

export default function Profile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();

  const [profileForm, setProfileForm] = useState({ username: '', avatar_url: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    setProfileLoading(true);

    try {
      const { data } = await authAPI.updateProfile({
        username: profileForm.username,
        avatar_url: profileForm.avatar_url || undefined,
      });
      setUser(data.user);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.response?.data?.error || t('common.error') });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage({ type: 'error', text: t('auth.password_mismatch') });
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setPasswordMessage({ type: 'error', text: t('auth.password_too_short') });
      return;
    }

    setPasswordLoading(true);

    try {
      await authAPI.updatePassword({
        new_password: passwordForm.new_password,
      });
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({ new_password: '', confirm_password: '' });
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.response?.data?.error || t('common.error') });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-container glass">
        <div className="profile-header">
          <h1 className="profile-title">Profile Settings</h1>
          <p className="auth-subtitle">{user.email}</p>
        </div>

        {/* Profile Info Section */}
        <div className="profile-section">
          <h3>Personal Information</h3>
          {profileMessage.text && (
            <div className={profileMessage.type === 'error' ? 'auth-error' : 'profile-success'}>
              {profileMessage.text}
            </div>
          )}
          <form className="auth-form" onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="input"
                type="text"
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                required
                disabled={profileLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Avatar URL</label>
              <input
                className="input"
                type="text"
                placeholder="https://example.com/avatar.png"
                value={profileForm.avatar_url}
                onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                disabled={profileLoading}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={profileLoading}>
              {profileLoading ? t('common.loading') : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="profile-section">
          <h3>Change Password</h3>
          {passwordMessage.text && (
            <div className={passwordMessage.type === 'error' ? 'auth-error' : 'profile-success'}>
              {passwordMessage.text}
            </div>
          )}
          <form className="auth-form" onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                required
                disabled={passwordLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                required
                disabled={passwordLoading}
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={passwordLoading}>
              {passwordLoading ? t('common.loading') : 'Update Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
