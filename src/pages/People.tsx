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
  const { user, mode, isOnline } = useAuth();
  const { addToast } = useToast();

  const [tab, setTab] = useState<'search' | 'friends' | 'requests'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Friendship[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);

  // Shared Calendar Modal state
  const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);

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
        addToast('Friend request sent', 'success');
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
      addToast(accept ? 'Friend request accepted' : 'Request declined', 'info');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">People & Friends</h1>
            <p className="page-subtitle">Find study partners and compare shared preparation progress</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="tag"
              style={{
                background: isOnline ? 'var(--success-subtle)' : 'var(--bg-tertiary)',
                color: isOnline ? 'var(--success)' : 'var(--text-tertiary)',
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
                            width: '42px',
                            height: '42px',
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
                              }}
                            >
                              {userItem.gate_paper === 'EC' ? 'EC' : 'CS'}
                            </span>
                          </div>
                          <div className="text-xs text-secondary">
                            @{userItem.username}
                            {userItem.target_gate_year && ` • GATE ${userItem.target_gate_year}`}
                          </div>
                          {userItem.bio && (
                            <div className="text-xs text-tertiary mt-1">{userItem.bio}</div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {(userItem.privacy?.share_calendar ?? true) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setInspectingUser(userItem)}
                          >
                            📅 View Calendar
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
                              Accept Request
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

                    {/* Shared Stats Row (Only if user permitted) */}
                    {prog && (
                      <div
                        className="stats-grid mt-3 pt-3 border-t"
                        style={{ borderColor: 'var(--border-primary)', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}
                      >
                        {(userItem.privacy?.share_study_hours ?? true) && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Study Time</div>
                            <div className="stat-value text-sm">{prog.total_study_hours || 0}h</div>
                          </div>
                        )}
                        {(userItem.privacy?.share_study_hours ?? true) && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Days Active</div>
                            <div className="stat-value text-sm">{prog.days_studied || 0}</div>
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
                            <div className="stat-value text-sm">{prog.overall_accuracy || 0}%</div>
                          </div>
                        )}
                        {(userItem.privacy?.share_syllabus_progress ?? true) && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Syllabus</div>
                            <div className="stat-value text-sm">{prog.syllabus_completion || 0}%</div>
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
            <div className="empty-state-title">No friends added yet</div>
            <div className="empty-state-text">Use the search tab to find and connect with friends</div>
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: friend.gate_paper === 'EC' ? '#059669' : 'var(--accent)',
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
                              background: friend.gate_paper === 'EC' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: friend.gate_paper === 'EC' ? '#10B981' : '#3B82F6',
                            }}
                          >
                            {friend.gate_paper === 'EC' ? 'EC' : 'CS'}
                          </span>
                        </div>
                        <div className="text-xs text-secondary">
                          @{friend.username} {friend.target_gate_year && `• GATE ${friend.target_gate_year}`}
                        </div>
                        {friend.bio && (
                          <div className="text-xs text-tertiary mt-1">{friend.bio}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setInspectingUser(friend)}
                      >
                        📅 View Calendar
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-danger"
                        title="Remove Friend"
                        onClick={() => handleRemove(f.id)}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>

                  {/* Friend's Shared Progress Stats */}
                  {prog ? (
                    <div
                      className="stats-grid mt-3 pt-3 border-t"
                      style={{ borderColor: 'var(--border-primary)', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}
                    >
                      {(friend.privacy?.share_study_hours ?? true) && (
                        <div className="stat-card" style={{ padding: '8px' }}>
                          <div className="stat-label">Study Time</div>
                          <div className="stat-value text-sm">{prog.total_study_hours || 0}h</div>
                        </div>
                      )}
                      {(friend.privacy?.share_study_hours ?? true) && (
                        <div className="stat-card" style={{ padding: '8px' }}>
                          <div className="stat-label">Days Active</div>
                          <div className="stat-value text-sm">{prog.days_studied || 0}</div>
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
                          <div className="stat-value text-sm">{prog.overall_accuracy || 0}%</div>
                        </div>
                      )}
                      {(friend.privacy?.share_syllabus_progress ?? true) && (
                        <div className="stat-card" style={{ padding: '8px' }}>
                          <div className="stat-label">Syllabus</div>
                          <div className="stat-value text-sm">{prog.syllabus_completion || 0}%</div>
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
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: profile?.gate_paper === 'EC' ? '#059669' : 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '0.95rem',
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{displayName}</div>
                          <div className="text-xs text-secondary">
                            @{profile?.username}
                            {profile?.target_gate_year && ` • GATE ${profile.target_gate_year}`}
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
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: profile?.gate_paper === 'EC' ? '#059669' : 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '0.95rem',
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{displayName}</div>
                          <div className="text-xs text-secondary">
                            @{profile?.username}
                            {profile?.target_gate_year && ` • GATE ${profile.target_gate_year}`}
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
    </div>
  );
}
