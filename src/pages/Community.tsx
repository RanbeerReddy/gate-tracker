import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  fetchCommunityPosts,
  createCommunityPost,
  deleteCommunityPost,
  togglePostLike,
  fetchPostComments,
  createPostComment,
  deletePostComment,
  reportContent,
  blockUser,
} from '../services/supabase';
import { CommunityPost, PostComment, Subject } from '../types';

export default function Community() {
  const { user, profile, mode, isOnline } = useAuth();
  const { addToast } = useToast();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState<'latest' | 'popular'>('latest');
  const [paperFilter, setPaperFilter] = useState<'all' | 'CS' | 'EC'>('all');
  const [activePaper, setActivePaper] = useState<string>('CS');
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Post composer state
  const [newContent, setNewContent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [attachTodayStats, setAttachTodayStats] = useState(false);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active comments modal state
  const [activePostForComments, setActivePostForComments] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Report modal state
  const [reportingTarget, setReportingTarget] = useState<{ postId?: string; commentId?: string; userId?: string } | null>(null);
  const [reportReason, setReportReason] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const data = await fetchCommunityPosts(0, 25, filter, paperFilter);
    setPosts(data);
    setLoading(false);
  }, [filter, paperFilter]);

  useEffect(() => {
    loadPosts();
    window.electronAPI.settings.get('gate_paper').then(p => {
      if (p) setActivePaper(p);
    }).catch(() => {});
    window.electronAPI.subjects.getAll().then(setSubjects).catch(() => {});
    window.electronAPI.analytics.getDashboard().then(d => {
      setTodayStats(d.today);
    }).catch(() => {});
  }, [loadPosts]);

  const handleCreatePost = async () => {
    if (!newContent.trim()) {
      addToast('Please write something before posting', 'warning');
      return;
    }
    if (!user) {
      addToast('Please sign in to post in the community', 'info');
      return;
    }

    setIsSubmitting(true);
    let sharedStatsPayload = null;

    if (attachTodayStats && todayStats) {
      sharedStatsPayload = {
        hours_studied: Math.round((todayStats.studySeconds / 3600) * 10) / 10,
        questions_solved: todayStats.questionsSolved || 0,
        accuracy: todayStats.accuracy || 0,
        subject_name: selectedSubject || undefined,
      };
    }

    const postTrack = profile?.gate_paper || activePaper || 'CS';
    const created = await createCommunityPost(
      newContent,
      selectedSubject || null,
      sharedStatsPayload,
      postTrack
    );

    setIsSubmitting(false);

    if (created) {
      setNewContent('');
      setSelectedSubject('');
      setAttachTodayStats(false);
      loadPosts();
      addToast('Post shared with community', 'success');
    } else {
      addToast('Could not publish post. Check connection.', 'error');
    }
  };

  const handleToggleLike = async (post: CommunityPost) => {
    if (!user) {
      addToast('Sign in to like posts', 'info');
      return;
    }

    const currentlyLiked = !!post.has_liked;
    // Optimistic UI update
    setPosts(prev =>
      prev.map(p =>
        p.id === post.id
          ? {
              ...p,
              has_liked: !currentlyLiked,
              likes_count: currentlyLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1,
            }
          : p
      )
    );

    const ok = await togglePostLike(post.id, currentlyLiked);
    if (!ok) {
      // Revert if failed
      loadPosts();
    }
  };

  const handleDeletePost = async (postId: string) => {
    const ok = await deleteCommunityPost(postId);
    if (ok) {
      setPosts(prev => prev.filter(p => p.id !== postId));
      addToast('Post deleted', 'info');
    } else {
      addToast('Failed to delete post', 'error');
    }
  };

  const openComments = async (post: CommunityPost) => {
    setActivePostForComments(post);
    setLoadingComments(true);
    const data = await fetchPostComments(post.id);
    setComments(data);
    setLoadingComments(false);
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !activePostForComments) return;
    if (!user) {
      addToast('Sign in to comment', 'info');
      return;
    }

    const res = await createPostComment(activePostForComments.id, newCommentText);
    if (res) {
      setComments(prev => [...prev, res]);
      setNewCommentText('');
      setPosts(prev =>
        prev.map(p =>
          p.id === activePostForComments.id
            ? { ...p, comments_count: p.comments_count + 1 }
            : p
        )
      );
      addToast('Comment added', 'success');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const ok = await deletePostComment(commentId);
    if (ok) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      if (activePostForComments) {
        setPosts(prev =>
          prev.map(p =>
            p.id === activePostForComments.id
              ? { ...p, comments_count: Math.max(0, p.comments_count - 1) }
              : p
          )
        );
      }
      addToast('Comment removed', 'info');
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    const ok = await blockUser(targetUserId);
    if (ok) {
      setPosts(prev => prev.filter(p => p.user_id !== targetUserId));
      addToast('User blocked', 'info');
    }
  };

  const handleSendReport = async () => {
    if (!reportingTarget || !reportReason.trim()) return;
    const ok = await reportContent({
      postId: reportingTarget.postId,
      commentId: reportingTarget.commentId,
      reportedUserId: reportingTarget.userId,
      reason: reportReason,
    });
    if (ok) {
      addToast('Report submitted for moderation', 'info');
      setReportingTarget(null);
      setReportReason('');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Community</h1>
            <p className="page-subtitle">Discuss concepts, ask doubts, and share preparation milestones</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="tag"
              style={{
                background: isOnline ? 'var(--success-subtle)' : 'var(--bg-tertiary)',
                color: isOnline ? 'var(--success)' : 'var(--text-tertiary)',
              }}
            >
              {isOnline ? '🟢 Connected' : '⚪ Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Mode / Authentication Banner */}
      {mode === 'local' && (
        <div className="card mb-4" style={{ background: 'var(--bg-tertiary)', borderLeft: '4px solid var(--accent)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-semibold text-sm">You are in Local Mode</div>
              <div className="text-xs text-secondary mt-1">
                Your personal study tracker is 100% private. Sign in with an account to participate in the community and talk with other GATE aspirants.
              </div>
            </div>
            <a href="#/settings" className="btn btn-primary btn-sm">Sign In / Register</a>
          </div>
        </div>
      )}

      {/* Post Composer */}
      {mode === 'authenticated' && (
        <div className="card mb-6" style={{ padding: 'var(--space-4)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-semibold text-sm">@{profile?.username || 'you'}</span>
            <span className="text-xs text-tertiary">Share a thought or progress update</span>
          </div>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="What are you studying today? Any tricky concepts or breakthroughs?"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />

          <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '160px', padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
              >
                <option value="">Tag Subject (optional)</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>

              {todayStats && (
                <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachTodayStats}
                    onChange={e => setAttachTodayStats(e.target.checked)}
                  />
                  <span>
                    Attach today's stats ({Math.round((todayStats.studySeconds / 3600) * 10) / 10}h studied)
                  </span>
                </label>
              )}
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreatePost}
              disabled={isSubmitting || !newContent.trim()}
            >
              {isSubmitting ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </div>
      )}

      {/* Feed Filters & Track Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="tabs mb-0">
          <button
            className={`tab ${filter === 'latest' ? 'active' : ''}`}
            onClick={() => setFilter('latest')}
          >
            ⏱️ Latest
          </button>
          <button
            className={`tab ${filter === 'popular' ? 'active' : ''}`}
            onClick={() => setFilter('popular')}
          >
            🔥 Popular
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            className={`btn btn-sm ${paperFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPaperFilter('all')}
          >
            All Papers
          </button>
          <button
            className={`btn btn-sm ${paperFilter === 'CS' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPaperFilter('CS')}
          >
            GATE CS
          </button>
          <button
            className={`btn btn-sm ${paperFilter === 'EC' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPaperFilter('EC')}
          >
            GATE EC
          </button>
        </div>
      </div>

      {/* Posts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-secondary)' }}>
          Loading community feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <div className="empty-state-title">No community posts yet</div>
          <div className="empty-state-text">
            Be the first to share an update or question with fellow GATE aspirants!
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {posts.map(post => {
            const author = post.author;
            const isOwnPost = user?.id === post.user_id;
            const postPaper = post.gate_paper || author?.gate_paper || 'CS';

            return (
              <div key={post.id} className="card" style={{ padding: 'var(--space-4)' }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 'var(--text-xs)',
                        color: '#fff',
                      }}
                    >
                      {author?.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt=""
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        (author?.display_name || author?.username || 'A')[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <span>{author?.display_name || `@${author?.username || 'user'}`}</span>
                        <span className="text-xs text-tertiary">@{author?.username}</span>
                        <span
                          className="tag"
                          style={{
                            background: postPaper === 'EC' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: postPaper === 'EC' ? '#10B981' : '#3B82F6',
                            fontSize: '10px',
                            padding: '1px 6px',
                            fontWeight: 600,
                          }}
                        >
                          {postPaper === 'EC' ? 'GATE EC' : 'GATE CS'}
                        </span>
                      </div>
                      <div className="text-xs text-tertiary">
                        {new Date(post.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {author?.target_gate_year && ` • GATE ${author.target_gate_year}`}
                      </div>
                    </div>
                  </div>

                  {/* Actions dropdown/buttons */}
                  <div className="flex items-center gap-1">
                    {post.subject_tag && (
                      <span className="tag" style={{ background: 'var(--bg-tertiary)' }}>
                        {post.subject_tag}
                      </span>
                    )}
                    {isOwnPost ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Delete Post"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        🗑
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Report Post"
                          onClick={() => setReportingTarget({ postId: post.id, userId: post.user_id })}
                        >
                          🚩
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Block User"
                          onClick={() => handleBlockUser(post.user_id)}
                        >
                          🚫
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="text-sm my-3" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {post.content}
                </div>

                {/* Attached Stats Card */}
                {post.shared_stats && (
                  <div
                    className="card my-3"
                    style={{
                      background: 'var(--bg-tertiary)',
                      padding: 'var(--space-3)',
                      borderLeft: '3px solid var(--accent)',
                    }}
                  >
                    <div className="text-xs font-semibold text-accent mb-1">📊 Shared Study Milestone</div>
                    <div className="flex items-center gap-4 text-xs text-secondary flex-wrap">
                      {post.shared_stats.subject_name && (
                        <span>Subject: <strong className="text-primary">{post.shared_stats.subject_name}</strong></span>
                      )}
                      {post.shared_stats.hours_studied !== undefined && (
                        <span>Hours: <strong className="text-primary">{post.shared_stats.hours_studied}h</strong></span>
                      )}
                      {post.shared_stats.questions_solved !== undefined && (
                        <span>Questions: <strong className="text-primary">{post.shared_stats.questions_solved}</strong></span>
                      )}
                      {post.shared_stats.accuracy !== undefined && post.shared_stats.accuracy > 0 && (
                        <span>Accuracy: <strong className="text-primary">{post.shared_stats.accuracy}%</strong></span>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer Reactions & Comments */}
                <div className="flex items-center gap-4 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <button
                    className={`btn btn-sm ${post.has_liked ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleToggleLike(post)}
                  >
                    {post.has_liked ? '❤️' : '🤍'} {post.likes_count || 0}
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openComments(post)}
                  >
                    💬 {post.comments_count || 0} Comments
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comments Drawer / Modal */}
      {activePostForComments && (
        <div className="modal-overlay" onClick={() => setActivePostForComments(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Comments ({comments.length})</h2>
              <button className="modal-close" onClick={() => setActivePostForComments(null)}>✕</button>
            </div>

            {/* Post snippet */}
            <div className="card mb-4" style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-3)' }}>
              <div className="text-xs text-tertiary mb-1">
                @{activePostForComments.author?.username} • {new Date(activePostForComments.created_at).toLocaleDateString()}
              </div>
              <div className="text-sm">{activePostForComments.content}</div>
            </div>

            {/* Comments thread */}
            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'grid', gap: 'var(--space-2)' }}>
              {loadingComments ? (
                <div className="text-sm text-secondary text-center py-4">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-xs text-tertiary text-center py-4">No comments yet. Write the first response!</div>
              ) : (
                comments.map(c => {
                  const isOwnComment = user?.id === c.user_id;
                  return (
                    <div key={c.id} className="card" style={{ padding: 'var(--space-3)' }}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold">
                          {c.author?.display_name || `@${c.author?.username || 'user'}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-tertiary">
                            {new Date(c.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOwnComment ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteComment(c.id)}>🗑</button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Report"
                              onClick={() => setReportingTarget({ commentId: c.id, userId: c.user_id })}
                            >
                              🚩
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm">{c.content}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add comment box */}
            {mode === 'authenticated' ? (
              <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Write a supportive comment or answer..."
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <button className="btn btn-primary" onClick={handleAddComment}>Send</button>
              </div>
            ) : (
              <div className="text-center text-xs text-secondary mt-3 pt-3 border-t">
                Sign in to join the conversation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Moderation Report Modal */}
      {reportingTarget && (
        <div className="modal-overlay" onClick={() => setReportingTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Report Content</h2>
              <button className="modal-close" onClick={() => setReportingTarget(null)}>✕</button>
            </div>
            <div className="text-sm text-secondary mb-3">
              Help keep the GATE community productive and respectful. Why are you reporting this?
            </div>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Spam, harassment, inappropriate content, off-topic..."
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
            />
            <div className="form-actions mt-3">
              <button className="btn btn-secondary" onClick={() => setReportingTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleSendReport} disabled={!reportReason.trim()}>
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
