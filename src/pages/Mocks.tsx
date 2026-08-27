import React, { useState, useEffect } from 'react';
import { MockTest, Subject } from '../types';
import { useToast } from '../contexts/ToastContext';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';

export default function Mocks() {
  const [mocks, setMocks] = useState<MockTest[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const { addToast } = useToast();

  const [form, setForm] = useState({
    date: formatLocalDate(new Date()), test_name: '', total_marks: '100',
    score: '', attempted: '', correct: '', wrong: '', unattempted: '',
    negative_marks: '0', time_minutes: '', notes: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [m, s] = await Promise.all([
      window.electronAPI.mocks.getAll(),
      window.electronAPI.subjects.getAll(),
    ]);
    setMocks(m);
    setSubjects(s);
  };

  const handleAdd = async () => {
    if (!form.test_name || !form.score) { addToast('Fill required fields', 'warning'); return; }
    await window.electronAPI.mocks.create({
      ...form,
      total_marks: parseFloat(form.total_marks),
      score: parseFloat(form.score),
      attempted: parseInt(form.attempted) || 0,
      correct: parseInt(form.correct) || 0,
      wrong: parseInt(form.wrong) || 0,
      unattempted: parseInt(form.unattempted) || 0,
      negative_marks: parseFloat(form.negative_marks) || 0,
      time_minutes: parseInt(form.time_minutes) || null,
    });
    setShowAdd(false);
    loadData();
    addToast('Mock test added', 'success');
  };

  const handleDelete = async (id: number) => {
    await window.electronAPI.mocks.delete(id);
    loadData();
    addToast('Mock test deleted', 'info');
  };

  const avgScore = mocks.length > 0 ? Math.round(mocks.reduce((s, m) => s + (m.score / m.total_marks) * 100, 0) / mocks.length) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Mock Tests</h1>
            <p className="page-subtitle">{mocks.length} tests recorded</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Mock Test</button>
        </div>
      </div>

      <div className="stats-grid mb-4">
        <div className="stat-card">
          <div className="stat-label">Total Tests</div>
          <div className="stat-value">{mocks.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Score</div>
          <div className="stat-value">{avgScore}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Best Score</div>
          <div className="stat-value">
            {mocks.length > 0 ? `${Math.round(Math.max(...mocks.map(m => (m.score / m.total_marks) * 100)))}%` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Latest Score</div>
          <div className="stat-value">
            {mocks.length > 0 ? `${mocks[0].score}/${mocks[0].total_marks}` : '—'}
          </div>
        </div>
      </div>

      {mocks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No mock tests</div>
          <div className="empty-state-text">Add your mock test results to track progress</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Test Name</th><th>Score</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Negative</th><th></th></tr>
            </thead>
            <tbody>
              {mocks.map(m => (
                <tr key={m.id}>
                  <td className="text-sm">{parseLocalDate(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="font-medium">{m.test_name}</td>
                  <td className="font-semibold">{m.score}/{m.total_marks}</td>
                  <td className="text-sm">{m.attempted}</td>
                  <td className="text-sm text-success">{m.correct}</td>
                  <td className="text-sm text-danger">{m.wrong}</td>
                  <td className="font-medium">
                    {m.attempted > 0 ? `${Math.round((m.correct / m.attempted) * 100)}%` : '—'}
                  </td>
                  <td className="text-sm text-danger">{m.negative_marks > 0 ? `-${m.negative_marks}` : '—'}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(m.id)}>🗑</button></td>
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
              <h2 className="modal-title">Add Mock Test</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Test Name *</label>
                <input className="form-input" value={form.test_name} onChange={e => setForm(f => ({ ...f, test_name: e.target.value }))} placeholder="e.g. GATE PYQ 2023" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Total Marks</label>
                <input className="form-input" type="number" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Score *</label>
                <input className="form-input" type="number" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Time (minutes)</label>
                <input className="form-input" type="number" value={form.time_minutes} onChange={e => setForm(f => ({ ...f, time_minutes: e.target.value }))} placeholder="180" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Attempted</label>
                <input className="form-input" type="number" value={form.attempted} onChange={e => setForm(f => ({ ...f, attempted: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Correct</label>
                <input className="form-input" type="number" value={form.correct} onChange={e => setForm(f => ({ ...f, correct: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Wrong</label>
                <input className="form-input" type="number" value={form.wrong} onChange={e => setForm(f => ({ ...f, wrong: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Unattempted</label>
                <input className="form-input" type="number" value={form.unattempted} onChange={e => setForm(f => ({ ...f, unattempted: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Negative Marks</label>
              <input className="form-input" type="number" value={form.negative_marks} onChange={e => setForm(f => ({ ...f, negative_marks: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Analysis, observations..." />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Save Mock Test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
