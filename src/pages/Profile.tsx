import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import SharedCalendarModal from '../components/social/SharedCalendarModal';

export default function Profile() {
  const { user, profile, privacySettings, mode, signIn, signUp, signOut, updateProfile, updatePrivacy, syncProgress, refreshProfile } = useAuth();
  const { addToast } = useToast();

  // Auth Form State
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear() + 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Edit Profile State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    target_gate_year: profile?.target_gate_year || new Date().getFullYear() + 1,
    gate_paper: profile?.gate_paper || 'CS',
  });

  // Preview Shared Calendar state
  const [showCalendarPreview, setShowCalendarPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Build safe display values — never show "undefined"
  const safeUsername = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'user';
  const safeDisplayName = profile?.display_name || user?.user_metadata?.display_name || safeUsername;
  const safeInitial = safeDisplayName[0]?.toUpperCase() || 'A';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'warning');
      return;
    }
    setIsSubmitting(true);
    const res = await signIn(email, password);
    setIsSubmitting(false);
    if (res.error) {
      addToast(res.error, 'error');
    } else {
      addToast('Signed in successfully', 'success');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) {
      addToast('Please fill all required fields', 'warning');
      return;
    }
    setIsSubmitting(true);
    const res = await signUp(email, password, username, displayName, targetYear);
    setIsSubmitting(false);
    if (res.error) {
      addToast(res.error, 'error');
    } else {
      addToast('Account created successfully!', 'success');
    }
  };

  const handleSaveProfile = async () => {
    const ok = await updateProfile(editForm);
    if (ok) {
      setShowEditModal(false);
      addToast('Profile updated', 'success');
    } else {
      addToast('Failed to update profile', 'error');
    }
  };

  const handleTogglePrivacy = async (key: keyof typeof privacySettings, val: boolean) => {
    const ok = await updatePrivacy({ [key]: val });
    if (ok) {
      addToast('Privacy settings updated', 'success');
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncProgress();
      addToast('Progress synchronized with cloud', 'success');
    } catch (err) {
      addToast('Sync failed — will retry next time', 'warning');
    }
    setIsSyncing(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Account & Profile</h1>
        <p className="page-subtitle">Manage your community profile and granular privacy controls</p>
      </div>

      {mode === 'local' ? (
        /* AUTH FORM (LOGIN / SIGN UP) */
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          <div className="card">
            <div className="tabs mb-4">
              <button
                className={`tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => setAuthTab('login')}
              >
                Sign In
              </button>
              <button
                className={`tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => setAuthTab('register')}
              >
                Create Account
              </button>
            </div>

            {authTab === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="aspirant@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 'var(--space-2)' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Username * (e.g. rahul_cs)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="alphanumeric, no spaces"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target GATE Year</label>
                  <select
                    className="form-select"
                    value={targetYear}
                    onChange={e => setTargetYear(parseInt(e.target.value))}
                  >
                    {[0, 1, 2, 3].map(o => {
                      const y = new Date().getFullYear() + o;
                      return <option key={y} value={y}>GATE {y}</option>;
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="aspirant@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 'var(--space-2)' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            )}

            <div className="text-xs text-tertiary text-center mt-4">
              🔒 Local study data remains strictly on your device until you opt into sharing.
            </div>
          </div>
        </div>
      ) : (
        /* LOGGED IN USER PROFILE & PRIVACY CONTROLS */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: 'var(--space-6)' }}>
          {/* Left Column: Profile Card */}
          <div>
            <div className="card text-center" style={{ padding: 'var(--space-6)' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-3)',
                }}
              >
                {safeInitial}
              </div>

              <div className="font-bold" style={{ fontSize: 'var(--text-lg)' }}>
                {safeDisplayName}
              </div>
              <div className="text-sm text-secondary mb-2">@{safeUsername}</div>

              <div className="flex items-center justify-center gap-2 mb-3">
                <span
                  className="tag"
                  style={{
                    background: (profile?.gate_paper === 'EC') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: (profile?.gate_paper === 'EC') ? '#10B981' : '#3B82F6',
                    fontWeight: 600,
                  }}
                >
                  {profile?.gate_paper === 'EC' ? 'GATE EC (ENTC/ECE)' : 'GATE CS (CSE/IT)'}
                </span>
                {profile?.target_gate_year && (
                  <span className="tag" style={{ background: 'var(--bg-tertiary)' }}>
                    🎯 GATE {profile.target_gate_year}
                  </span>
                )}
              </div>

              {profile?.bio && (
                <div className="text-sm text-secondary my-3" style={{ fontStyle: 'italic' }}>
                  "{profile.bio}"
                </div>
              )}

              <div className="flex gap-2 justify-center mt-4">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setEditForm({
                      display_name: profile?.display_name || '',
                      bio: profile?.bio || '',
                      target_gate_year: profile?.target_gate_year || new Date().getFullYear() + 1,
                      gate_paper: profile?.gate_paper || 'CS',
                    });
                    setShowEditModal(true);
                  }}
                >
                  ✏️ Edit Profile
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Syncing...' : '🔄 Sync Progress'}
                </button>
              </div>

              <button
                className="btn btn-ghost btn-sm text-danger mt-6"
                onClick={async () => {
                  setIsSigningOut(true);
                  await signOut();
                  setIsSigningOut(false);
                }}
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>

          {/* Right Column: Granular Privacy Controls */}
          <div>
            <div className="section">
              <div className="section-title">Granular Privacy & Sharing Settings</div>
              <div className="card" style={{ padding: 'var(--space-5)' }}>
                <div className="text-sm text-secondary mb-4">
                  Control exactly what aggregate preparation data is shared with the community.
                  All items default to <strong>OFF</strong>. Detailed private notes, exact session times, and mistake lists are never exposed.
                </div>

                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  {/* Share Profile Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">Public Profile</div>
                      <div className="text-xs text-tertiary">Allow other aspirants to search your username and view your bio</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.share_profile}
                      onChange={e => handleTogglePrivacy('share_profile', e.target.checked)}
                    />
                  </div>

                  {/* Share Calendar Toggle */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div>
                      <div className="font-semibold text-sm">Share Study Calendar Heatmap</div>
                      <div className="text-xs text-tertiary">Allows peers to see your daily study hours and consistency (no notes/topics)</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {privacySettings.share_calendar && profile && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setShowCalendarPreview(true)}
                        >
                          👁️ Preview
                        </button>
                      )}
                      <input
                        type="checkbox"
                        checked={privacySettings.share_calendar}
                        onChange={e => handleTogglePrivacy('share_calendar', e.target.checked)}
                      />
                    </div>
                  </div>

                  {/* Share Study Hours Toggle */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div>
                      <div className="font-semibold text-sm">Share Total Study Hours & Streak</div>
                      <div className="text-xs text-tertiary">Shows total aggregate hours and active day streak on your profile card</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.share_study_hours}
                      onChange={e => handleTogglePrivacy('share_study_hours', e.target.checked)}
                    />
                  </div>

                  {/* Share Question Stats Toggle */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div>
                      <div className="font-semibold text-sm">Share Question Volume & Accuracy</div>
                      <div className="text-xs text-tertiary">Shows aggregate questions solved count and overall accuracy %</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.share_question_stats}
                      onChange={e => handleTogglePrivacy('share_question_stats', e.target.checked)}
                    />
                  </div>

                  {/* Share Syllabus Progress Toggle */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div>
                      <div className="font-semibold text-sm">Share Syllabus Completion %</div>
                      <div className="text-xs text-tertiary">Displays aggregate topic completion percentage on your public card</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.share_syllabus_progress}
                      onChange={e => handleTogglePrivacy('share_syllabus_progress', e.target.checked)}
                    />
                  </div>

                  {/* Visibility Scope */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div>
                      <div className="font-semibold text-sm">Default Visibility Scope</div>
                      <div className="text-xs text-tertiary">Who can see enabled statistics</div>
                    </div>
                    <select
                      className="form-select"
                      style={{ width: 'auto' }}
                      value={privacySettings.visibility}
                      onChange={e => updatePrivacy({ visibility: e.target.value as any })}
                    >
                      <option value="public">Public (All Aspirants)</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Profile</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input
                type="text"
                className="form-input"
                value={editForm.display_name}
                onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target GATE Track</label>
              <select
                className="form-select"
                value={editForm.gate_paper}
                onChange={e => setEditForm(f => ({ ...f, gate_paper: e.target.value as any }))}
              >
                <option value="CS">GATE CS — Computer Science & IT (CSE/IT)</option>
                <option value="EC">GATE EC — Electronics & Communication (ENTC/ECE)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target GATE Year</label>
              <select
                className="form-select"
                value={editForm.target_gate_year}
                onChange={e => setEditForm(f => ({ ...f, target_gate_year: parseInt(e.target.value) }))}
              >
                {[0, 1, 2, 3].map(o => {
                  const y = new Date().getFullYear() + o;
                  return <option key={y} value={y}>GATE {editForm.gate_paper || 'CS'} {y}</option>;
                })}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Bio (Brief status or goal)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Targeting Top 100 AIR in GATE..."
                value={editForm.bio}
                onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Shared Calendar Modal */}
      {showCalendarPreview && profile && (
        <SharedCalendarModal
          user={profile}
          onClose={() => setShowCalendarPreview(false)}
        />
      )}
    </div>
  );
}
