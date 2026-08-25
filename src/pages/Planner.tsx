import React, { useState, useEffect } from 'react';
import { PlannedSession, Subject, Topic, ACTIVITY_TYPES, ActivityType } from '../types';
import { useToast } from '../contexts/ToastContext';

export default function Planner() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [planned, setPlanned] = useState<PlannedSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const { addToast } = useToast();

  const [form, setForm] = useState({
    subject_id: '' as any, topic_id: '' as any, activity_type: 'learning' as ActivityType,
    start_time: '09:00', end_time: '10:30', notes: '',
  });

  useEffect(() => { loadData(); }, [date]);

  const loadData = async () => {
    const [p, s] = await Promise.all([
      window.electronAPI.planner.getByDate(date),
      window.electronAPI.subjects.getAll(),
    ]);
    setPlanned(p);
    setSubjects(s);
  };

  const handleFormSubjectChange = async (subjectId: number) => {
    setForm(f => ({ ...f, subject_id: subjectId, topic_id: '' }));
    if (subjectId) {
      const t = await window.electronAPI.topics.getBySubject(subjectId);
      setTopics(t);
    } else { setTopics([]); }
  };

  const handleAdd = async () => {
    if (!form.subject_id) { addToast('Select a subject', 'warning'); return; }
    await window.electronAPI.planner.create({
      date,
      subject_id: parseInt(form.subject_id),
      topic_id: form.topic_id ? parseInt(form.topic_id) : null,
      activity_type: form.activity_type,
      start_time: form.start_time,
      end_time: form.end_time,
      notes: form.notes || null,
    });
    setShowAdd(false);
    loadData();
    addToast('Session planned', 'success');
  };

  const handleDelete = async (id: number) => {
    await window.electronAPI.planner.delete(id);
    loadData();
  };

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().slice(0, 10));
  };

  const isToday = date === new Date().toISOString().slice(0, 10);

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Daily Planner</h1>
            <div className="flex items-center gap-3 mt-2">
              <button className="btn btn-ghost btn-sm" onClick={() => changeDate(-1)}>←</button>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '160px', textAlign: 'center' }} />
              <button className="btn btn-ghost btn-sm" onClick={() => changeDate(1)}>→</button>
              {!isToday && <button className="btn btn-ghost btn-sm" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Today</button>}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Block</button>
        </div>
      </div>

      {planned.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">No sessions planned</div>
          <div className="empty-state-text">Plan your study blocks for {isToday ? 'today' : date}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {planned.map(p => (
            <div key={p.id} className="card" style={{
              padding: 'var(--space-4)',
              borderLeft: `3px solid ${p.subject_color || 'var(--accent)'}`,
              opacity: p.is_completed ? 0.6 : 1,
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm font-medium">{p.start_time} – {p.end_time}</span>
                    {p.is_completed && <span className="tag" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>✓ Done</span>}
                  </div>
                  <div className="font-semibold">{p.subject_name}</div>
                  {p.topic_name && <div className="text-sm text-secondary">{p.topic_name}</div>}
                  <div className="text-xs text-tertiary mt-1">
                    {ACTIVITY_TYPES.find(a => a.value === p.activity_type)?.icon}{' '}
                    {ACTIVITY_TYPES.find(a => a.value === p.activity_type)?.label}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Plan Study Block</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input className="form-input" type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input className="form-input" type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select className="form-select" value={form.subject_id} onChange={e => handleFormSubjectChange(parseInt(e.target.value))}>
                <option value="">Select...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Topic</label>
              <select className="form-select" value={form.topic_id} onChange={e => setForm(f => ({ ...f, topic_id: e.target.value }))}>
                <option value="">Select...</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Activity</label>
              <select className="form-select" value={form.activity_type} onChange={e => setForm(f => ({ ...f, activity_type: e.target.value as ActivityType }))}>
                {ACTIVITY_TYPES.map(a => <option key={a.value} value={a.value}>{a.icon} {a.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Plan Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
