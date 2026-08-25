import React, { useState, useEffect } from 'react';
import { Goal, Phase, Subject } from '../types';
import { useToast } from '../contexts/ToastContext';

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tab, setTab] = useState<'goals' | 'phases'>('goals');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const { addToast } = useToast();

  const [goalForm, setGoalForm] = useState({ type: 'daily', metric: 'study_hours', target_value: '', notes: '' });
  const [phaseForm, setPhaseForm] = useState({ name: '', start_date: '', end_date: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [g, p, s] = await Promise.all([
      window.electronAPI.goals.getActive(),
      window.electronAPI.phases.getAll(),
      window.electronAPI.subjects.getAll(),
    ]);
    setGoals(g);
    setPhases(p);
    setSubjects(s);
  };

  const handleAddGoal = async () => {
    if (!goalForm.target_value) { addToast('Set a target', 'warning'); return; }
    await window.electronAPI.goals.create({
      ...goalForm,
      target_value: parseFloat(goalForm.target_value),
    });
    setShowAddGoal(false);
    loadData();
    addToast('Goal created', 'success');
  };

  const handleAddPhase = async () => {
    if (!phaseForm.name || !phaseForm.start_date || !phaseForm.end_date) {
      addToast('Fill required fields', 'warning'); return;
    }
    await window.electronAPI.phases.create(phaseForm);
    setShowAddPhase(false);
    loadData();
    addToast('Phase created', 'success');
  };

  const handleDeleteGoal = async (id: number) => {
    await window.electronAPI.goals.delete(id);
    loadData();
  };

  const metricLabels: Record<string, string> = {
    study_hours: 'hours', questions: 'questions', accuracy: '%', completion: '%',
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Goals & Phases</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'goals' ? 'active' : ''}`} onClick={() => setTab('goals')}>Goals</button>
        <button className={`tab ${tab === 'phases' ? 'active' : ''}`} onClick={() => setTab('phases')}>Phases</button>
      </div>

      {tab === 'goals' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div />
            <button className="btn btn-primary" onClick={() => setShowAddGoal(true)}>+ Add Goal</button>
          </div>
          {goals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div className="empty-state-title">No goals set</div>
              <div className="empty-state-text">Set daily, weekly, or monthly goals to stay on track</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {goals.map(g => {
                const progress = g.target_value > 0 ? Math.min(100, (g.current_value / g.target_value) * 100) : 0;
                return (
                  <div key={g.id} className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="tag" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                          {g.type}
                        </span>
                        <span className="font-medium">{g.metric.replace('_', ' ')}</span>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteGoal(g.id)}>🗑</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold" style={{ fontSize: 'var(--text-xl)', minWidth: '100px' }}>
                        {Math.round(g.current_value * 10) / 10} / {g.target_value} {metricLabels[g.metric] || ''}
                      </div>
                      <div className="flex-1">
                        <div className="progress-bar progress-bar-lg">
                          <div className="progress-bar-fill" style={{
                            width: `${progress}%`,
                            background: progress >= 100 ? 'var(--success)' : 'var(--accent)',
                          }} />
                        </div>
                      </div>
                      <div className="font-semibold" style={{
                        color: progress >= 100 ? 'var(--success)' : 'var(--text-primary)',
                      }}>
                        {Math.round(progress)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'phases' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div />
            <button className="btn btn-primary" onClick={() => setShowAddPhase(true)}>+ Add Phase</button>
          </div>
          {phases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No phases defined</div>
              <div className="empty-state-text">Organize your preparation into phases</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {phases.map(p => (
                <div key={p.id} className="card" style={{ padding: 'var(--space-4)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold" style={{ fontSize: 'var(--text-lg)' }}>{p.name}</div>
                    <span className="text-sm text-secondary">{p.start_date} → {p.end_date}</span>
                  </div>
                  {p.subjects && p.subjects.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {p.subjects.map((s: any) => (
                        <span key={s.id} className="tag" style={{ background: `${s.subject_color}20`, color: s.subject_color }}>
                          <span className="tag-dot" style={{ background: s.subject_color }} />
                          {s.subject_name} ({s.target_completion}%)
                        </span>
                      ))}
                    </div>
                  )}
                  {p.notes && <div className="text-sm text-secondary mt-2">{p.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="modal-overlay" onClick={() => setShowAddGoal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Goal</h2>
              <button className="modal-close" onClick={() => setShowAddGoal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={goalForm.type} onChange={e => setGoalForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Metric</label>
                <select className="form-select" value={goalForm.metric} onChange={e => setGoalForm(f => ({ ...f, metric: e.target.value }))}>
                  <option value="study_hours">Study Hours</option>
                  <option value="questions">Questions Solved</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Target</label>
              <input className="form-input" type="number" value={goalForm.target_value}
                onChange={e => setGoalForm(f => ({ ...f, target_value: e.target.value }))}
                placeholder={goalForm.metric === 'study_hours' ? 'e.g. 7' : 'e.g. 50'} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddGoal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddGoal}>Create Goal</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Phase Modal */}
      {showAddPhase && (
        <div className="modal-overlay" onClick={() => setShowAddPhase(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Phase</h2>
              <button className="modal-close" onClick={() => setShowAddPhase(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Phase Name *</label>
              <input className="form-input" value={phaseForm.name} onChange={e => setPhaseForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Phase 1 - Fundamentals" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input className="form-input" type="date" value={phaseForm.start_date} onChange={e => setPhaseForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input className="form-input" type="date" value={phaseForm.end_date} onChange={e => setPhaseForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={phaseForm.notes} onChange={e => setPhaseForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddPhase(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddPhase}>Create Phase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
