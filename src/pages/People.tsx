import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  searchUsers,
  fetchFriends,
  fetchPendingFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
} from '../services/supabase';
import { UserProfile, Friendship } from '../types';
import SharedCalendarModal from '../components/social/SharedCalendarModal';

export default function People() {
  const { user, profile: myProfile, mode, isOnline, syncProgress } = useAuth();
  const { addToast } = useToast();

  const [tab, setTab] = useState<'search' | 'friends' | 'requests'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Friendship[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);
  const [detailedFriend, setDetailedFriend] = useState<UserProfile | null>(null);
  const [comparingFriend, setComparingFriend] = useState<UserProfile | null>(null);

  const loadFriendsData = useCallback(async () => {
    if (!user) return;
    try {
      const [f, reqs] = await Promise.all([
        fetchFriends(user.id),
        fetchPendingFriendRequests(user.id),
      ]);
      setFriends(f);
      setIncomingRequests(reqs.incoming);
      setOutgoingRequests(reqs.outgoing);
    } catch (err) {
      console.warn('Error loading friends data:', err);
    }
  }, [user]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setLoading(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      console.warn('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOnline) {
      if (user) {
        loadFriendsData();
        // Sync progress in background so our friends see fresh data
        syncProgress().catch(() => {});
      }
      handleSearch('');
    }
  }, [user, isOnline, loadFriendsData, handleSearch]);

  const handleSendRequest = async (targetUserId: string) => {
    if (!user) {
      addToast('Sign in to connect with friends', 'info');
      return;
    }
    const res = await sendFriendRequest(targetUserId);
    if (res.success) {
      if (res.action === 'accepted') {
        addToast('Friend request accepted! You are now connected.', 'success');
      } else if (res.action === 'already_sent') {
        addToast('Friend request is already pending', 'info');
      } else if (res.action === 'already_friends') {
        addToast('You are already friends', 'info');
      } else {
        addToast('Friend request sent! 🤝', 'success');
      }
      await Promise.all([
        loadFriendsData(),
        handleSearch(searchQuery),
      ]);
    } else {
      addToast(res.error || 'Failed to send request', 'error');
    }
  };

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    const ok = await respondFriendRequest(friendshipId, accept);
    if (ok) {
      addToast(accept ? 'Friend request accepted! 🎉' : 'Request declined', 'info');
      await Promise.all([
        loadFriendsData(),
        handleSearch(searchQuery),
      ]);
    } else {
      addToast('Could not process request', 'error');
    }
  };

  const handleRemove = async (friendshipId: string) => {
    const ok = await removeFriend(friendshipId);
    if (ok) {
      addToast('Friend removed', 'info');
      await Promise.all([
        loadFriendsData(),
        handleSearch(searchQuery),
      ]);
    } else {
      addToast('Could not remove friend', 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="page-title">People & Friends</h1>
            <p className="page-subtitle">Find study partners, compare preparation progress, and inspect shared calendars</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                await syncProgress();
                await loadFriendsData();
                addToast('Synced progress with cloud! ☁️', 'success');
              }}
              title="Sync latest local stats to cloud"
            >
              🔄 Sync to Cloud
            </button>
            <span
              className="tag"
              style={{
                background: isOnline ? 'var(--success-subtle)' : 'var(--bg-tertiary)',
                color: isOnline ? 'var(--success)' : 'var(--text-tertiary)',
                fontWeight: 600,
              }}
            >
              {isOnline ? '🟢 Connected' : '⚪ No Network'}
            </span>
          </div>
        </div>
      </div>

      {mode === 'local' && (
        <div className="card mb-4" style={{ background: 'var(--bg-tertiary)', borderLeft: '4px solid var(--accent)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-semibold text-sm">Local Mode Active</div>
              <div className="text-xs text-secondary mt-1">
                Sign in with an account to search usernames, add study partners, and view shared study heatmaps.
              </div>
            </div>
            <a href="#/profile" className="btn btn-primary btn-sm">Sign In / Create Account</a>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs mb-4">
        <button
          className={`tab ${tab === 'search' ? 'active' : ''}`}
          onClick={() => setTab('search')}
        >
          🔍 Search Aspirants
        </button>
        <button
          className={`tab ${tab === 'friends' ? 'active' : ''}`}
          onClick={() => setTab('friends')}
        >
          👥 Friends ({friends.length})
        </button>
        <button
          className={`tab ${tab === 'requests' ? 'active' : ''}`}
          onClick={() => setTab('requests')}
        >
          📬 Requests
          {incomingRequests.length > 0 && (
            <span
              className="tag"
              style={{
                marginLeft: '6px',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
              }}
            >
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* SEARCH TAB */}
      {tab === 'search' && (
        <div>
          <div className="card mb-4" style={{ padding: 'var(--space-3)' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by username or display name (e.g. rahul, karan)..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-6 text-secondary text-sm">Searching users...</div>
          ) : searchResults.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">
                {searchQuery ? 'No users found' : 'Search for GATE Aspirants'}
              </div>
              <div className="empty-state-text">
                {searchQuery ? 'Try another username or handle' : 'Connect with friends to share calendars and study consistency'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {searchResults.map(userItem => {
                const prog = userItem.progress;
                const isSelf = userItem.id === user?.id;
                const isFriend = friends.some(
                  f => (f.friend_profile?.id || (f.requester_id === user?.id ? f.addressee_id : f.requester_id)) === userItem.id
                );
                const incomingReq = incomingRequests.find(
                  r => (r.friend_profile?.id || r.requester_id) === userItem.id
                );
                const outgoingReq = outgoingRequests.find(
                  r => (r.friend_profile?.id || r.addressee_id) === userItem.id
                );
                const hasPendingIn = !!incomingReq;
                const hasPendingOut = !!outgoingReq;

                const displayName = userItem.display_name || userItem.username || 'GATE Aspirant';
                const initial = (displayName[0] || 'A').toUpperCase();

                return (
                  <div key={userItem.id} className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: userItem.gate_paper === 'EC' ? '#059669' : 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '1.1rem',
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            <span>{displayName}</span>
                            <span
                              className="tag"
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                background: userItem.gate_paper === 'EC' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: userItem.gate_paper === 'EC' ? '#10B981' : '#3B82F6',
                                fontWeight: 700,
                              }}
                            >
                              GATE {userItem.gate_paper || 'CS'}
                            </span>
                          </div>
                          <div className="text-xs text-secondary">
                            @{userItem.username}
                            {userItem.target_gate_year && ` • Target GATE ${userItem.target_gate_year}`}
                          </div>
                          {userItem.bio && (
                            <div className="text-xs text-tertiary mt-1">{userItem.bio}</div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {prog && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setDetailedFriend(userItem)}
                            title="View full subject breakdown & accuracy"
                          >
                            📊 Details
                          </button>
                        )}

                        {(userItem.privacy?.share_calendar ?? true) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setInspectingUser(userItem)}
                            title="View multi-year heatmap calendar"
                          >
                            📅 Calendar
                          </button>
                        )}

                        {isSelf ? (
                          <span className="tag" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 600 }}>
                            You (Your Profile)
                          </span>
                        ) : isFriend ? (
                          <span className="tag" style={{ background: 'var(--success-subtle)', color: 'var(--success)', fontWeight: 600 }}>
                            ✓ Friends
                          </span>
                        ) : hasPendingIn ? (
                          <div className="flex gap-2">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                if (incomingReq) handleRespond(incomingReq.id, true);
                              }}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                if (incomingReq) handleRespond(incomingReq.id, false);
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        ) : hasPendingOut ? (
                          <div className="flex items-center gap-2">
                            <span className="tag" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                              Request Sent
                            </span>
                            <button
                              className="btn btn-ghost btn-sm text-danger"
                              title="Cancel Request"
                              onClick={() => {
                                if (outgoingReq) handleRemove(outgoingReq.id);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSendRequest(userItem.id)}
                          >
                            + Add Friend
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Shared Stats Row */}
                    {prog && (
                      <div
                        className="stats-grid mt-3 pt-3 border-t"
                        style={{ borderColor: 'var(--border-primary)', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))' }}
                      >
                        {(userItem.privacy?.share_study_hours ?? true) && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Study Time</div>
                            <div className="stat-value text-sm">{prog.total_study_hours || 0}h</div>
                          </div>
                        )}
                        {(userItem.privacy?.share_study_hours ?? true) && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Streak 🔥</div>
                            <div className="stat-value text-sm text-warning">{prog.current_streak || 0}d</div>
                          </div>
                        )}
                        {(userItem.privacy?.share_question_stats ?? true) && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Questions</div>
                            <div className="stat-value text-sm">{prog.questions_solved || 0}</div>
                          </div>
                        )}
                        {(userItem.privacy?.share_question_stats ?? true) && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Accuracy</div>
                            <div className="stat-value text-sm text-success">{prog.overall_accuracy || 0}%</div>
                          </div>
                        )}
                        {(userItem.privacy?.share_syllabus_progress ?? true) && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Syllabus</div>
                            <div className="stat-value text-sm text-accent">{prog.syllabus_completion || 0}%</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FRIENDS TAB */}
      {tab === 'friends' && (
        friends.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No friends connected yet</div>
            <div className="empty-state-text">Search aspirants using the search tab above to share calendars and study roadmaps</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {friends.map(f => {
              const friend = f.friend_profile;
              if (!friend) return null;
              const prog = friend.progress;
              const displayName = friend.display_name || friend.username || 'Friend';
              const initial = (displayName[0] || 'F').toUpperCase();

              return (
                <div key={f.id} className="card" style={{ padding: 'var(--space-4)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: friend.gate_paper === 'EC' ? '#059669' : 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: '#fff',
                          fontSize: '1.2rem',
                        }}
                      >
                        {initial}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          <span>{displayName}</span>
                          <span
                            className="tag"
                            style={{
                              fontSize: '10px',
                              padding: '1px 5px',
                              background: friend.gate_paper === 'EC' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: friend.gate_paper === 'EC' ? '#10B981' : '#3B82F6',
                              fontWeight: 700,
                            }}
                          >
                            GATE {friend.gate_paper || 'CS'}
                          </span>
                        </div>
                        <div className="text-xs text-secondary">
                          @{friend.username} {friend.target_gate_year && `• Target GATE ${friend.target_gate_year}`}
                        </div>
                        {friend.bio && (
                          <div className="text-xs text-tertiary mt-1">{friend.bio}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {prog && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setComparingFriend(friend)}
                          title="Compare your progress side-by-side with friend"
                        >
                          ⚡ Compare vs You
                        </button>
                      )}

                      {prog && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setDetailedFriend(friend)}
                          title="View subject completion breakdown"
                        >
                          📊 Subjects
                        </button>
                      )}

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setInspectingUser(friend)}
                        title="View multi-year heatmap calendar"
                      >
                        📅 Calendar
                      </button>

                      <button
                        className="btn btn-ghost btn-sm text-danger"
                        title="Remove Friend"
                        onClick={() => handleRemove(f.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Friend's Shared Progress Stats */}
                  {prog ? (
                    <div
                      className="stats-grid mt-3 pt-3 border-t"
                      style={{ borderColor: 'var(--border-primary)', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))' }}
                    >
                      {(friend.privacy?.share_study_hours ?? true) && (
                        <div className="stat-card" style={{ padding: '8px' }}>
                          <div className="stat-label">Study Time</div>
                          <div className="stat-value text-sm">{prog.total_study_hours || 0}h</div>
                        </div>
                      )}
                      {(friend.privacy?.share_study_hours ?? true) && (
                        <div className="stat-card" style={{ padding: '8px' }}>
                          <div className="stat-label">Streak 🔥</div>
                          <div className="stat-value text-sm text-warning">{prog.current_streak || 0}d</div>
                        </div>
                      )}
                      {(friend.privacy?.share_question_stats ?? true) && (
                        <div className="stat-card" style={{ padding: '8px' }}>
                          <div className="stat-label">Questions</div>
                          <div className="stat-value text-sm">{prog.questions_solved || 0}</div>
                        </div>
                      )}
                      {(friend.privacy?.share_question_stats ?? true) && (
                        <div className="stat-card" style={{ padding: '8px' }}>
                          <div className="stat-label">Accuracy</div>
                          <div className="stat-value text-sm text-success">{prog.overall_accuracy || 0}%</div>
                        </div>
                      )}
                      {(friend.privacy?.share_syllabus_progress ?? true) && (
                        <div className="stat-card" style={{ padding: '8px' }}>
                          <div className="stat-label">Syllabus</div>
                          <div className="stat-value text-sm text-accent">{prog.syllabus_completion || 0}%</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-tertiary mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                      🔒 Progress stats will appear once your friend syncs their study metrics.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* REQUESTS TAB */}
      {tab === 'requests' && (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div>
            <div className="section-title">Incoming Requests ({incomingRequests.length})</div>
            {incomingRequests.length === 0 ? (
              <div className="card text-sm text-tertiary" style={{ padding: 'var(--space-4)' }}>
                No incoming friend requests.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {incomingRequests.map(r => {
                  const profile = r.friend_profile;
                  const displayName = profile?.display_name || profile?.username || 'GATE Aspirant';
                  const initial = (displayName[0] || 'A').toUpperCase();

                  return (
                    <div key={r.id} className="card flex items-center justify-between flex-wrap gap-2" style={{ padding: 'var(--space-3)' }}>
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: profile?.gate_paper === 'EC' ? '#059669' : 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '1rem',
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{displayName}</div>
                          <div className="text-xs text-secondary">
                            @{profile?.username}
                            {profile?.target_gate_year && ` • Target GATE ${profile.target_gate_year}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => handleRespond(r.id, true)}>Accept</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleRespond(r.id, false)}>Decline</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="section-title">Sent Requests ({outgoingRequests.length})</div>
            {outgoingRequests.length === 0 ? (
              <div className="card text-sm text-tertiary" style={{ padding: 'var(--space-4)' }}>
                No sent requests pending.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {outgoingRequests.map(r => {
                  const profile = r.friend_profile;
                  const displayName = profile?.display_name || profile?.username || 'GATE Aspirant';
                  const initial = (displayName[0] || 'A').toUpperCase();

                  return (
                    <div key={r.id} className="card flex items-center justify-between flex-wrap gap-2" style={{ padding: 'var(--space-3)' }}>
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: profile?.gate_paper === 'EC' ? '#059669' : 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '1rem',
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{displayName}</div>
                          <div className="text-xs text-secondary">
                            @{profile?.username}
                            {profile?.target_gate_year && ` • Target GATE ${profile.target_gate_year}`}
                          </div>
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleRemove(r.id)}>Cancel</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shared Calendar Inspect Modal */}
      {inspectingUser && (
        <SharedCalendarModal
          user={inspectingUser}
          onClose={() => setInspectingUser(null)}
        />
      )}

      {/* Friend Detailed Subject Breakdown Modal */}
      {detailedFriend && (
        <div className="modal-overlay" onClick={() => setDetailedFriend(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Progress & Subject Breakdown • @{detailedFriend.username}</h2>
                <p className="text-xs text-secondary mt-1">Shared syllabus mastery and subject coverage</p>
              </div>
              <button className="modal-close" onClick={() => setDetailedFriend(null)}>✕</button>
            </div>

            {/* Top Stat Summary */}
            <div className="stats-grid mb-4">
              <div className="stat-card">
                <div className="stat-label">Study Time</div>
                <div className="stat-value text-accent">{detailedFriend.progress?.total_study_hours || 0}h</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Days Active</div>
                <div className="stat-value">{detailedFriend.progress?.days_studied || 0}d</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Questions</div>
                <div className="stat-value text-success">{detailedFriend.progress?.questions_solved || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Syllabus</div>
                <div className="stat-value text-accent">{detailedFriend.progress?.syllabus_completion || 0}%</div>
              </div>
            </div>

            {/* Subject Progress List */}
            <div className="section-title mb-2">Subject Coverage & Time Logged</div>
            {(!detailedFriend.progress?.subject_progress || detailedFriend.progress.subject_progress.length === 0) ? (
              <div className="text-xs text-secondary p-4 bg-tertiary rounded text-center">
                No individual subject breakdown shared yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {detailedFriend.progress.subject_progress.map((s: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-tertiary)',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold flex items-center gap-2">
                        <span className="color-dot" style={{ background: s.color || 'var(--accent)' }} />
                        {s.name}
                      </span>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-secondary">{s.hours || 0}h studied</span>
                        <span className="font-bold text-accent">{s.completion || 0}%</span>
                      </div>
                    </div>
                    <div className="progress-bar" style={{ height: '6px' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(100, s.completion || 0)}%`,
                          background: s.color || 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const target = detailedFriend;
                  setDetailedFriend(null);
                  setInspectingUser(target);
                }}
              >
                📅 View @{detailedFriend.username}'s Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Compare Modal: You vs Friend */}
      {comparingFriend && (
        <div className="modal-overlay" onClick={() => setComparingFriend(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">⚡ Progress Comparison: You vs @{comparingFriend.username}</h2>
                <p className="text-xs text-secondary mt-1">Side-by-side consistency & preparation overview</p>
              </div>
              <button className="modal-close" onClick={() => setComparingFriend(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              {/* YOU */}
              <div className="card" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent)' }}>
                <div className="font-bold text-base text-accent mb-2">You ({myProfile?.display_name || 'Your Profile'})</div>
                <div className="text-xs text-secondary mb-3">Track: GATE {myProfile?.gate_paper || 'CS'}</div>

                <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: '13px' }}>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Study Time:</span>
                    <span className="font-bold font-mono">{myProfile?.progress?.total_study_hours || 0}h</span>
                  </div>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Days Active:</span>
                    <span className="font-bold font-mono">{myProfile?.progress?.days_studied || 0} days</span>
                  </div>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Current Streak:</span>
                    <span className="font-bold font-mono text-warning">{myProfile?.progress?.current_streak || 0}d 🔥</span>
                  </div>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Questions Solved:</span>
                    <span className="font-bold font-mono">{myProfile?.progress?.questions_solved || 0}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Accuracy:</span>
                    <span className="font-bold font-mono text-success">{myProfile?.progress?.overall_accuracy || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Syllabus Complete:</span>
                    <span className="font-bold font-mono text-accent">{myProfile?.progress?.syllabus_completion || 0}%</span>
                  </div>
                </div>
              </div>

              {/* FRIEND */}
              <div className="card" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <div className="font-bold text-base text-primary mb-2">@{comparingFriend.username}</div>
                <div className="text-xs text-secondary mb-3">Track: GATE {comparingFriend.gate_paper || 'CS'}</div>

                <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: '13px' }}>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Study Time:</span>
                    <span className="font-bold font-mono">{comparingFriend.progress?.total_study_hours || 0}h</span>
                  </div>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Days Active:</span>
                    <span className="font-bold font-mono">{comparingFriend.progress?.days_studied || 0} days</span>
                  </div>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Current Streak:</span>
                    <span className="font-bold font-mono text-warning">{comparingFriend.progress?.current_streak || 0}d 🔥</span>
                  </div>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Questions Solved:</span>
                    <span className="font-bold font-mono">{comparingFriend.progress?.questions_solved || 0}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-secondary">Accuracy:</span>
                    <span className="font-bold font-mono text-success">{comparingFriend.progress?.overall_accuracy || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Syllabus Complete:</span>
                    <span className="font-bold font-mono text-accent">{comparingFriend.progress?.syllabus_completion || 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const target = comparingFriend;
                  setComparingFriend(null);
                  setInspectingUser(target);
                }}
              >
                📅 View @{comparingFriend.username}'s Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
