import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/auth';
import { vocabularyAPI } from '../api/vocabulary';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import './Auth.css';
import './Profile.css';

const LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'th', name: 'ไทย (Thai)' },
  { code: 'id', name: 'Bahasa Indonesia (Indonesian)' },
];

export default function Profile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();

  const [profileForm, setProfileForm] = useState({ username: '', avatar_url: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Translation settings state
  const [targetLang, setTargetLang] = useState('vi');
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        avatar_url: user.avatar_url || '',
      });
      setTargetLang(user.translate_target_lang || 'vi');
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
      toast.success('Profile updated successfully!');
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || t('common.error');
      toast.error(errorMsg);
      setProfileMessage({ type: 'error', text: errorMsg });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error(t('auth.password_mismatch'));
      setPasswordMessage({ type: 'error', text: t('auth.password_mismatch') });
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error(t('auth.password_too_short'));
      setPasswordMessage({ type: 'error', text: t('auth.password_too_short') });
      return;
    }

    setPasswordLoading(true);

    try {
      await authAPI.updatePassword({
        new_password: passwordForm.new_password,
      });
      toast.success('Password updated successfully!');
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({ new_password: '', confirm_password: '' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || t('common.error');
      toast.error(errorMsg);
      setPasswordMessage({ type: 'error', text: errorMsg });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);

    try {
      const { data } = await vocabularyAPI.updateSettings(targetLang);
      setUser(data.user);
      toast.success('Settings updated successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Lỗi khi cập nhật cài đặt';
      toast.error(errorMsg);
    } finally {
      setSettingsLoading(false);
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

        {/* Translation Settings Section */}
        <div className="profile-section">
          <h3>Translation Settings</h3>
          <p className="settings-desc">Select your target language when translating stories.</p>
          <form className="auth-form" onSubmit={handleSettingsSubmit}>
            <div className="form-group">
              <label className="form-label">Target Language</label>
              <select
                className="input select-input"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={settingsLoading}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={settingsLoading}>
              {settingsLoading ? t('common.loading') : 'Save Settings'}
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
