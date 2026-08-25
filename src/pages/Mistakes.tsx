import React, { useState, useEffect } from 'react';
import { Mistake, Subject, Topic, MISTAKE_CATEGORIES } from '../types';
import { useToast } from '../contexts/ToastContext';

export default function Mistakes() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterResolved, setFilterResolved] = useState<string>('');
  const { addToast } = useToast();

  const [form, setForm] = useState({ subject_id: '' as any, topic_id: '' as any, category: 'other', explanation: '', correction: '', what_to_notice: '' });
  const [formTopics, setFormTopics] = useState<Topic[]>([]);

  useEffect(() => { loadData(); }, [filterCategory, filterResolved]);

  const loadData = async () => {
    const [s, m] = await Promise.all([
      window.electronAPI.subjects.getAll(),
      window.electronAPI.mistakes.getAll({
        category: filterCategory || undefined,
        is_resolved: filterResolved !== '' ? filterResolved === '1' : undefined,
      }),
    ]);
    setSubjects(s);
    setMistakes(m);
  };

  const handleAdd = async () => {
    if (!form.subject_id) { addToast('Select a subject', 'warning'); return; }
    await window.electronAPI.mistakes.create({
      ...form,
      subject_id: parseInt(form.subject_id),
      topic_id: form.topic_id ? parseInt(form.topic_id) : null,
    });
    setShowAdd(false);
    loadData();
    addToast('Mistake logged', 'success');
  };

  const handleResolve = async (id: number) => {
    await window.electronAPI.mistakes.resolve(id);
    loadData();
    addToast('Mistake resolved', 'success');
  };

  const handleDelete = async (id: number) => {
    await window.electronAPI.mistakes.delete(id);
    loadData();
    addToast('Deleted', 'info');
  };

  const handleFormSubjectChange = async (subjectId: number) => {
    setForm(f => ({ ...f, subject_id: subjectId, topic_id: '' }));
    if (subjectId) {
      const t = await window.electronAPI.topics.getBySubject(subjectId);
      setFormTopics(t);
    } else { setFormTopics([]); }
  };

  const unresolvedCount = mistakes.filter(m => !m.is_resolved).length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Mistakes</h1>
            <p className="page-subtitle">{unresolvedCount} unresolved • {mistakes.length} total</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Log Mistake</button>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {MISTAKE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select className="form-select" value={filterResolved} onChange={e => setFilterResolved(e.target.value)}>
          <option value="">All</option>
          <option value="0">Unresolved</option>
          <option value="1">Resolved</option>
        </select>
      </div>

      {mistakes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">No mistakes logged</div>
          <div className="empty-state-text">Log mistakes to identify patterns and improve</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {mistakes.map(m => (
            <div key={m.id} className="card" style={{ padding: 'var(--space-4)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="color-dot" style={{ background: m.subject_color }} />
                  <span className="text-sm font-medium">{m.subject_name}</span>
                  {m.topic_name && <span className="text-sm text-secondary">→ {m.topic_name}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag" style={{ background: m.is_resolved ? 'var(--success-subtle)' : 'var(--warning-subtle)', color: m.is_resolved ? 'var(--success)' : 'var(--warning)' }}>
                    {m.is_resolved ? '✓ Resolved' : 'Unresolved'}
                  </span>
                  <span className="tag" style={{ background: 'var(--bg-tertiary)' }}>
                    {MISTAKE_CATEGORIES.find(c => c.value === m.category)?.label || m.category}
                  </span>
                </div>
              </div>
              {m.explanation && <div className="text-sm mb-2"><strong className="text-secondary">What went wrong:</strong> {m.explanation}</div>}
              {m.correction && <div className="text-sm mb-2"><strong className="text-secondary">Correction:</strong> {m.correction}</div>}
              {m.what_to_notice && <div className="text-sm mb-2"><strong className="text-secondary">What to notice:</strong> {m.what_to_notice}</div>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-tertiary">{new Date(m.created_at).toLocaleDateString()}</span>
                {!m.is_resolved && <button className="btn btn-success btn-sm" onClick={() => handleResolve(m.id)}>✓ Resolve</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(m.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Log Mistake</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="form-row">
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
                  {formTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {MISTAKE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">What went wrong?</label>
              <textarea className="form-textarea" value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Correction</label>
              <textarea className="form-textarea" value={form.correction} onChange={e => setForm(f => ({ ...f, correction: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">What to notice next time</label>
              <textarea className="form-textarea" value={form.what_to_notice} onChange={e => setForm(f => ({ ...f, what_to_notice: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Log Mistake</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
