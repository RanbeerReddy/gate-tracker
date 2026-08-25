import React, { useState, useEffect } from 'react';
import { Revision, Subject, Topic } from '../types';
import { useToast } from '../contexts/ToastContext';

export default function RevisionPage() {
  const [dueRevisions, setDueRevisions] = useState<Revision[]>([]);
  const [schedule, setSchedule] = useState<Revision[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tab, setTab] = useState<'due' | 'schedule' | 'log'>('due');
  const [showLog, setShowLog] = useState(false);
  const [formTopics, setFormTopics] = useState<Topic[]>([]);
  const { addToast } = useToast();

  const [form, setForm] = useState({ topic_id: '' as any, subject_id: '' as any, performance_rating: 3, confidence: 50, notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [due, sched, subs] = await Promise.all([
      window.electronAPI.revisions.getDue(),
      window.electronAPI.revisions.getSchedule(),
      window.electronAPI.subjects.getAll(),
    ]);
    setDueRevisions(due);
    setSchedule(sched);
    setSubjects(subs);
  };

  const handleSubjectChange = async (subjectId: number) => {
    setForm(f => ({ ...f, subject_id: subjectId, topic_id: '' }));
    if (subjectId) {
      const t = await window.electronAPI.topics.getBySubject(subjectId);
      setFormTopics(t);
    } else { setFormTopics([]); }
  };

  const handleLogRevision = async () => {
    if (!form.topic_id) { addToast('Select a topic', 'warning'); return; }
    await window.electronAPI.revisions.create({
      topic_id: parseInt(form.topic_id),
      performance_rating: form.performance_rating,
      confidence: form.confidence,
      notes: form.notes || null,
    });
    setShowLog(false);
    loadData();
    addToast('Revision logged', 'success');
  };

  const handleQuickRevision = async (topicId: number, performance: number) => {
    await window.electronAPI.revisions.create({
      topic_id: topicId,
      performance_rating: performance,
      confidence: performance * 20,
    });
    loadData();
    addToast('Revision completed', 'success');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Revision</h1>
            <p className="page-subtitle">{dueRevisions.length} revisions due</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowLog(true)}>+ Log Revision</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'due' ? 'active' : ''}`} onClick={() => setTab('due')}>
          Due Now ({dueRevisions.length})
        </button>
        <button className={`tab ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>
          Schedule ({schedule.length})
        </button>
      </div>

      {tab === 'due' && (
        dueRevisions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">All caught up!</div>
            <div className="empty-state-text">No revisions due today. Keep studying!</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {dueRevisions.map(r => (
              <div key={r.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="color-dot" style={{ background: r.subject_color }} />
                      <span className="text-sm text-secondary">{r.subject_name}</span>
                    </div>
                    <div className="font-semibold">{r.topic_name}</div>
                    <div className="text-xs text-tertiary mt-1">
                      Revision #{r.revision_number} • Due: {r.next_revision_date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary">Rate:</span>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} className="btn btn-secondary btn-sm"
                        onClick={() => handleQuickRevision(r.topic_id, n)}
                        title={n <= 2 ? 'Poor' : n === 3 ? 'OK' : 'Good'}>
                        {n}⭐
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'schedule' && (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Topic</th><th>Subject</th><th>Next Due</th><th>Revision #</th><th>Confidence</th></tr>
            </thead>
            <tbody>
              {schedule.map(r => (
                <tr key={r.id}>
                  <td className="font-medium">{r.topic_name}</td>
                  <td><span className="flex items-center gap-2"><span className="color-dot" style={{ background: r.subject_color }} />{r.subject_name}</span></td>
                  <td className={r.next_revision_date && r.next_revision_date <= new Date().toISOString().slice(0, 10) ? 'text-warning font-medium' : 'text-sm'}>
                    {r.next_revision_date || '—'}
                  </td>
                  <td className="text-sm">{r.revision_number}</td>
                  <td className="text-sm">{r.topic_confidence ? `${r.topic_confidence}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showLog && (
        <div className="modal-overlay" onClick={() => setShowLog(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Log Revision</h2>
              <button className="modal-close" onClick={() => setShowLog(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="form-select" value={form.subject_id} onChange={e => handleSubjectChange(parseInt(e.target.value))}>
                <option value="">Select...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Topic *</label>
              <select className="form-select" value={form.topic_id} onChange={e => setForm(f => ({ ...f, topic_id: e.target.value }))}>
                <option value="">Select...</option>
                {formTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Performance (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} className={`btn ${form.performance_rating === n ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, performance_rating: n }))}>{n}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confidence: {form.confidence}%</label>
              <input type="range" min="0" max="100" value={form.confidence}
                onChange={e => setForm(f => ({ ...f, confidence: parseInt(e.target.value) }))} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowLog(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleLogRevision}>Log Revision</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
