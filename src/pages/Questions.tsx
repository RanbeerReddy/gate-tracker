import React, { useState, useEffect } from 'react';
import { Subject, Topic, Question, ACTIVITY_TYPES } from '../types';
import { useToast } from '../contexts/ToastContext';

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filterSubject, setFilterSubject] = useState<number | ''>('');
  const [filterCorrect, setFilterCorrect] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const { addToast } = useToast();

  // Form state
  const [form, setForm] = useState({
    subject_id: '' as any, topic_id: '' as any, difficulty: 'medium',
    question_type: 'mcq', is_correct: '' as any, time_seconds: '' as any,
    confidence: 'medium', is_pyq: false, source: '', year: '' as any, notes: '',
  });
  const [formTopics, setFormTopics] = useState<Topic[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [s, q] = await Promise.all([
      window.electronAPI.subjects.getAll(),
      window.electronAPI.questions.getAll({
        subject_id: filterSubject || undefined,
        is_correct: filterCorrect !== '' ? filterCorrect === '1' : undefined,
        difficulty: filterDifficulty || undefined,
      }),
    ]);
    setSubjects(s);
    setQuestions(q);
  };

  useEffect(() => { loadData(); }, [filterSubject, filterCorrect, filterDifficulty]);

  const handleFormSubjectChange = async (subjectId: number) => {
    setForm(f => ({ ...f, subject_id: subjectId, topic_id: '' }));
    if (subjectId) {
      const t = await window.electronAPI.topics.getBySubject(subjectId);
      setFormTopics(t);
    } else {
      setFormTopics([]);
    }
  };

  const handleAdd = async () => {
    if (!form.subject_id) { addToast('Select a subject', 'warning'); return; }
    await window.electronAPI.questions.create({
      ...form,
      subject_id: parseInt(form.subject_id),
      topic_id: form.topic_id ? parseInt(form.topic_id) : null,
      is_correct: form.is_correct !== '' ? form.is_correct === '1' : null,
      time_seconds: form.time_seconds ? parseInt(form.time_seconds) : null,
      year: form.year ? parseInt(form.year) : null,
    });
    setShowAdd(false);
    setForm({ subject_id: form.subject_id, topic_id: '', difficulty: 'medium', question_type: 'mcq',
      is_correct: '' as any, time_seconds: '' as any, confidence: 'medium', is_pyq: false, source: '', year: '' as any, notes: '' });
    loadData();
    addToast('Question logged', 'success');
  };

  const handleDelete = async (id: number) => {
    await window.electronAPI.questions.delete(id);
    loadData();
    addToast('Question deleted', 'info');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Questions</h1>
            <p className="page-subtitle">{questions.length} questions logged</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Log Question</button>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value ? parseInt(e.target.value) : '')}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="form-select" value={filterCorrect} onChange={e => setFilterCorrect(e.target.value)}>
          <option value="">All Results</option>
          <option value="1">Correct</option>
          <option value="0">Wrong</option>
        </select>
        <select className="form-select" value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <div className="empty-state-title">No questions logged</div>
          <div className="empty-state-text">Start logging questions to track your accuracy</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Subject</th><th>Topic</th><th>Result</th><th>Difficulty</th><th>Time</th><th>PYQ</th><th></th></tr>
            </thead>
            <tbody>
              {questions.map(q => (
                <tr key={q.id}>
                  <td className="text-sm">{new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td><span className="flex items-center gap-2"><span className="color-dot" style={{ background: q.subject_color }} />{q.subject_name}</span></td>
                  <td className="text-secondary text-sm">{q.topic_name || '—'}</td>
                  <td>{q.is_correct === 1 ? <span className="text-success font-medium">✓ Correct</span> : q.is_correct === 0 ? <span className="text-danger font-medium">✗ Wrong</span> : '—'}</td>
                  <td><span className="tag" style={{ background: q.difficulty === 'hard' ? 'var(--danger-subtle)' : q.difficulty === 'easy' ? 'var(--success-subtle)' : 'var(--bg-tertiary)', color: q.difficulty === 'hard' ? 'var(--danger)' : q.difficulty === 'easy' ? 'var(--success)' : 'var(--text-secondary)' }}>{q.difficulty}</span></td>
                  <td className="font-mono text-sm">{q.time_seconds ? `${Math.floor(q.time_seconds / 60)}m ${q.time_seconds % 60}s` : '—'}</td>
                  <td>{q.is_pyq ? '📝' : ''}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(q.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Log Question</h2>
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
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Result</label>
                <select className="form-select" value={form.is_correct} onChange={e => setForm(f => ({ ...f, is_correct: e.target.value }))}>
                  <option value="">Not specified</option>
                  <option value="1">Correct</option>
                  <option value="0">Wrong</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="form-select" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Time (seconds)</label>
                <input className="form-input" type="number" value={form.time_seconds} onChange={e => setForm(f => ({ ...f, time_seconds: e.target.value }))} placeholder="120" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Source</label>
                <input className="form-input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. PYQ, Test Book" />
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input className="form-input" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" />
              </div>
              <div className="form-group">
                <label className="form-label">Confidence</label>
                <select className="form-select" value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_pyq} onChange={e => setForm(f => ({ ...f, is_pyq: e.target.checked }))} />
                <span className="text-sm">This is a PYQ (Previous Year Question)</span>
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Log Question</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
