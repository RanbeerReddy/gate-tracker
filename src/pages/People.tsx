import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (user && isOnline) {
      loadFriendsData();
    }
  }, [user, isOnline]);

  const loadFriendsData = async () => {
    if (!user) return;
    const [f, reqs] = await Promise.all([
      fetchFriends(user.id),
      fetchPendingFriendRequests(user.id),
    ]);
    setFriends(f);
    setIncomingRequests(reqs.incoming);
    setOutgoingRequests(reqs.outgoing);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    const results = await searchUsers(query);
    setSearchResults(results.filter(u => u.id !== user?.id));
    setLoading(false);
  };

  const handleSendRequest = async (targetUserId: string) => {
    if (!user) {
      addToast('Sign in to connect with friends', 'info');
      return;
    }
    const ok = await sendFriendRequest(targetUserId);
    if (ok) {
      addToast('Friend request sent', 'success');
      loadFriendsData();
    } else {
      addToast('Failed to send request', 'error');
    }
  };

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    const ok = await respondFriendRequest(friendshipId, accept);
    if (ok) {
      addToast(accept ? 'Friend request accepted' : 'Request declined', 'info');
      loadFriendsData();
    }
  };

  const handleRemove = async (friendshipId: string) => {
    const ok = await removeFriend(friendshipId);
    if (ok) {
      addToast('Friend removed', 'info');
      loadFriendsData();
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
              {isOnline ? '🟢 Online' : '⚪ Offline'}
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
            <a href="#/settings" className="btn btn-primary btn-sm">Sign In / Create Account</a>
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
          📬 Requests {incomingRequests.length > 0 && `(${incomingRequests.length})`}
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
                const isFriend = friends.some(f => f.friend_profile?.id === userItem.id);
                const hasPendingOut = outgoingRequests.some(r => r.friend_profile?.id === userItem.id);
                const hasPendingIn = incomingRequests.some(r => r.friend_profile?.id === userItem.id);

                return (
                  <div key={userItem.id} className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          {(userItem.display_name || userItem.username)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{userItem.display_name}</div>
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
                        {userItem.privacy?.share_calendar && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setInspectingUser(userItem)}
                          >
                            📅 View Calendar
                          </button>
                        )}

                        {isFriend ? (
                          <span className="tag" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                            ✓ Friends
                          </span>
                        ) : hasPendingOut ? (
                          <span className="tag" style={{ background: 'var(--bg-tertiary)' }}>
                            Request Sent
                          </span>
                        ) : hasPendingIn ? (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              const req = incomingRequests.find(r => r.friend_profile?.id === userItem.id);
                              if (req) handleRespond(req.id, true);
                            }}
                          >
                            Accept Request
                          </button>
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
                        {userItem.privacy?.share_study_hours && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Study Time</div>
                            <div className="stat-value text-sm">{prog.total_study_hours}h</div>
                          </div>
                        )}
                        {userItem.privacy?.share_study_hours && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Days Active</div>
                            <div className="stat-value text-sm">{prog.days_studied}</div>
                          </div>
                        )}
                        {userItem.privacy?.share_question_stats && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Questions</div>
                            <div className="stat-value text-sm">{prog.questions_solved}</div>
                          </div>
                        )}
                        {userItem.privacy?.share_question_stats && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Accuracy</div>
                            <div className="stat-value text-sm">{prog.overall_accuracy}%</div>
                          </div>
                        )}
                        {userItem.privacy?.share_syllabus_progress && (
                          <div className="stat-card" style={{ padding: '8px' }}>
                            <div className="stat-label">Syllabus</div>
                            <div className="stat-value text-sm">{prog.syllabus_completion}%</div>
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
              return (
                <div key={f.id} className="card" style={{ padding: 'var(--space-4)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: '#fff',
                        }}
                      >
                        {(friend.display_name || friend.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{friend.display_name}</div>
                        <div className="text-xs text-secondary">
                          @{friend.username} {friend.target_gate_year && `• GATE ${friend.target_gate_year}`}
                        </div>
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
              <div className="text-sm text-tertiary">No incoming friend requests.</div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {incomingRequests.map(r => (
                  <div key={r.id} className="card flex items-center justify-between" style={{ padding: 'var(--space-3)' }}>
                    <div>
                      <div className="font-semibold text-sm">{r.friend_profile?.display_name}</div>
                      <div className="text-xs text-secondary">@{r.friend_profile?.username}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-success btn-sm" onClick={() => handleRespond(r.id, true)}>Accept</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleRespond(r.id, false)}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="section-title">Sent Requests ({outgoingRequests.length})</div>
            {outgoingRequests.length === 0 ? (
              <div className="text-sm text-tertiary">No sent requests pending.</div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {outgoingRequests.map(r => (
                  <div key={r.id} className="card flex items-center justify-between" style={{ padding: 'var(--space-3)' }}>
                    <div>
                      <div className="font-semibold text-sm">{r.friend_profile?.display_name}</div>
                      <div className="text-xs text-secondary">@{r.friend_profile?.username}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleRemove(r.id)}>Cancel</button>
                  </div>
                ))}
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
