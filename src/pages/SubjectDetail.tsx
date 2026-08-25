import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Topic, TOPIC_STATUSES } from '../types';
import { useToast } from '../contexts/ToastContext';

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    const s = await window.electronAPI.analytics.getSubjectStats(parseInt(id!));
    if (s) {
      setSubject(s.subject);
      setStats(s);
      setEditName(s.subject.name);
      setEditColor(s.subject.color);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopicName.trim()) return;
    await window.electronAPI.topics.create({ subject_id: parseInt(id!), name: newTopicName.trim() });
    setNewTopicName('');
    setShowAddTopic(false);
    loadData();
    addToast('Topic added', 'success');
  };

  const handleUpdateSubject = async () => {
    await window.electronAPI.subjects.update(parseInt(id!), { name: editName, color: editColor });
    setEditing(false);
    loadData();
    addToast('Subject updated', 'success');
  };

  const handleStatusChange = async (topicId: number, status: string) => {
    await window.electronAPI.topics.updateStatus(topicId, status);
    loadData();
  };

  if (!stats) return <div className="page"><div className="text-secondary">Loading...</div></div>;

  const formatHours = (secs: number) => {
    const h = (secs || 0) / 3600;
    return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/subjects')} style={{ marginBottom: 'var(--space-2)' }}>
          ← Back to Subjects
        </button>
        <div className="flex items-center gap-3">
          <div className="subject-card-color" style={{ background: subject.color, height: '32px', width: '4px', borderRadius: '4px' }} />
          {editing ? (
            <div className="flex items-center gap-2">
              <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '250px' }} />
              <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '40px', height: '36px', border: 'none' }} />
              <button className="btn btn-primary btn-sm" onClick={handleUpdateSubject}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          ) : (
            <div>
              <h1 className="page-title" style={{ cursor: 'pointer' }} onClick={() => setEditing(true)}>{subject.name}</h1>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid mb-4">
        <div className="stat-card">
          <div className="stat-label">Study Time</div>
          <div className="stat-value">{formatHours(stats.totalStudyHours * 3600)}</div>
          <div className="stat-sub">This week: {formatHours(stats.weekStudyHours * 3600)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Questions</div>
          <div className="stat-value">{stats.totalQuestions}</div>
          <div className="stat-sub">{stats.accuracy}% accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completion</div>
          <div className="stat-value">
            {stats.topics.length > 0
              ? Math.round(stats.topics.filter((t: any) => t.status === 'completed' || t.status === 'strong').length / stats.topics.length * 100)
              : 0}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">PYQs</div>
          <div className="stat-value">{stats.pyqCount}</div>
        </div>
      </div>

      {/* Topics */}
      <div className="section">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title" style={{ marginBottom: 0 }}>Topics ({stats.topics.length})</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddTopic(true)}>+ Add Topic</button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Status</th>
                <th>Study Time</th>
                <th>Questions</th>
                <th>Accuracy</th>
                <th>Revisions</th>
              </tr>
            </thead>
            <tbody>
              {stats.topics.map((t: any) => (
                <tr key={t.id} className="cursor-pointer" onClick={() => navigate(`/topics/${t.id}`)}>
                  <td className="font-medium">{t.name}</td>
                  <td>
                    <select
                      className="form-select"
                      value={t.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); handleStatusChange(t.id, e.target.value); }}
                      style={{ width: '140px', padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                    >
                      {TOPIC_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="font-mono text-sm">{formatHours(t.study_seconds || 0)}</td>
                  <td>{t.question_count || 0}</td>
                  <td>
                    {t.question_count > 0
                      ? <span className={t.correct_count / t.question_count < 0.6 ? 'text-danger' : 'text-success'}>
                          {Math.round((t.correct_count / t.question_count) * 100)}%
                        </span>
                      : '—'}
                  </td>
                  <td>{t.revision_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Topic Modal */}
      {showAddTopic && (
        <div className="modal-overlay" onClick={() => setShowAddTopic(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Topic</h2>
              <button className="modal-close" onClick={() => setShowAddTopic(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Topic Name</label>
              <input className="form-input" value={newTopicName} onChange={e => setNewTopicName(e.target.value)}
                placeholder="Topic name" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddTopic()} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddTopic(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddTopic}>Add Topic</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
