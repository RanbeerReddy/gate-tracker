import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import SharedCalendarModal from '../components/social/SharedCalendarModal';

export default function Profile() {
  const { user, profile, privacySettings, mode, signIn, signUp, signInWithOAuth, signOut, updateProfile, updatePrivacy, syncProgress, refreshProfile } = useAuth();
  const { addToast } = useToast();

  // Auth Form State
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear() + 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
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
  const safeDisplayName = profile?.display_name || user?.user_metadata?.display_name || user?.user_metadata?.full_name || safeUsername;
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

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setIsOAuthLoading(provider);
    const res = await signInWithOAuth(provider);
    // Don't clear loading immediately — the browser will open and
    // the user will return via deep link, triggering onAuthStateChange
    if (res.error) {
      addToast(res.error, 'error');
      setIsOAuthLoading(null);
    } else {
      addToast('Opening browser for sign-in... Return to the app after authenticating.', 'info');
      // Clear loading after a reasonable timeout in case user cancels
      setTimeout(() => setIsOAuthLoading(null), 30000);
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

            {/* OAuth Quick Login Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <button
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  fontSize: 'var(--text-sm)',
                }}
                onClick={() => handleOAuthLogin('google')}
                disabled={!!isOAuthLoading}
              >
                {isOAuthLoading === 'google' ? (
                  <span>Opening browser...</span>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.03l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <button
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  fontSize: 'var(--text-sm)',
                }}
                onClick={() => handleOAuthLogin('github')}
                disabled={!!isOAuthLoading}
              >
                {isOAuthLoading === 'github' ? (
                  <span>Opening browser...</span>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>Continue with GitHub</span>
                  </>
                )}
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              color: 'var(--text-tertiary)',
              fontSize: 'var(--text-xs)',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-primary)' }} />
              <span>or use email</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-primary)' }} />
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
                  background: profile?.avatar_url ? 'transparent' : 'var(--accent)',
                  color: '#fff',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-3)',
                  overflow: 'hidden',
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={safeDisplayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.textContent = safeInitial;
                    }}
                  />
                ) : (
                  safeInitial
                )}
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

              {/* Show sign-in method indicator */}
              {user?.app_metadata?.provider && user.app_metadata.provider !== 'email' && (
                <div className="text-xs text-tertiary mb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span>Signed in via</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {user.app_metadata.provider}
                  </span>
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
