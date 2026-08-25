import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TOPIC_STATUSES } from '../types';
import { useToast } from '../contexts/ToastContext';

export default function TopicDetail() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<any>(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    const s = await window.electronAPI.analytics.getTopicStats(parseInt(id!));
    setStats(s);
  };

  const handleStatusChange = async (status: string) => {
    await window.electronAPI.topics.updateStatus(parseInt(id!), status);
    loadData();
    addToast('Status updated', 'success');
  };

  if (!stats) return <div className="page"><div className="text-secondary">Loading...</div></div>;
  const { topic } = stats;
  const formatHours = (h: number) => h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/subjects/${topic.subject_id}`)} style={{ marginBottom: 'var(--space-2)' }}>
          ← {topic.subject_name}
        </button>
        <div className="flex items-center gap-3">
          <span className="color-dot color-dot-lg" style={{ background: topic.subject_color }} />
          <h1 className="page-title">{topic.name}</h1>
          <select className="form-select" value={topic.status} onChange={e => handleStatusChange(e.target.value)}
            style={{ width: '150px', marginLeft: 'var(--space-3)' }}>
            {TOPIC_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="stats-grid mb-4">
        <div className="stat-card">
          <div className="stat-label">Study Time</div>
          <div className="stat-value">{formatHours(stats.studyHours)}</div>
          <div className="stat-sub">{stats.sessionCount} sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Questions</div>
          <div className="stat-value">{stats.totalQuestions}</div>
          <div className="stat-sub">{stats.accuracy}% accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revisions</div>
          <div className="stat-value">{stats.revisions.length}</div>
          <div className="stat-sub">Confidence: {topic.confidence || 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mistakes</div>
          <div className="stat-value">{stats.mistakes.length}</div>
        </div>
      </div>

      {/* Subtopics */}
      {stats.subtopics.length > 0 && (
        <div className="section">
          <div className="section-title">Subtopics ({stats.subtopics.length})</div>
          <div className="card" style={{ padding: 0 }}>
            {stats.subtopics.map((st: any) => (
              <div key={st.id} style={{ padding: 'var(--space-2) var(--space-4)', borderBottom: '1px solid var(--border-primary)', fontSize: 'var(--text-sm)' }}>
                {st.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revision History */}
      {stats.revisions.length > 0 && (
        <div className="section">
          <div className="section-title">Revision History</div>
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Performance</th><th>Confidence</th><th>Next Due</th><th>Notes</th></tr></thead>
              <tbody>
                {stats.revisions.map((r: any) => (
                  <tr key={r.id}>
                    <td className="text-sm">{r.revision_date}</td>
                    <td>{r.performance_rating ? '⭐'.repeat(r.performance_rating) : '—'}</td>
                    <td>{r.confidence ? `${r.confidence}%` : '—'}</td>
                    <td className="text-sm">{r.next_revision_date || '—'}</td>
                    <td className="text-sm text-secondary">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {stats.sessions.length > 0 && (
        <div className="section">
          <div className="section-title">Recent Sessions</div>
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Activity</th><th>Duration</th></tr></thead>
              <tbody>
                {stats.sessions.slice(0, 10).map((s: any) => (
                  <tr key={s.id}>
                    <td className="text-sm">{new Date(s.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="text-sm">{s.activity_type.replace('_', ' ')}</td>
                    <td className="font-mono text-sm">{formatHours(s.duration_seconds / 3600)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
