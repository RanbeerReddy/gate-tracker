import React, { useState, useEffect } from 'react';
import { Goal, Phase, Subject } from '../types';
import { useToast } from '../contexts/ToastContext';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';

type GoalFilter = 'all' | 'daily' | 'weekly' | 'monthly';

export default function Goals() {
  const { addToast } = useToast();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tab, setTab] = useState<'goals' | 'phases'>('goals');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('all');

  // Modals
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddPhase, setShowAddPhase] = useState(false);

  // Forms
  const [goalForm, setGoalForm] = useState({
    type: 'daily',
    metric: 'study_hours',
    target_value: '',
    notes: '',
  });

  const [phaseForm, setPhaseForm] = useState({
    name: '',
    start_date: formatLocalDate(new Date()),
    end_date: formatLocalDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    notes: '',
    is_active: true,
    selectedSubjects: [] as Array<{ subject_id: number; target_completion: number }>,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [g, p, s] = await Promise.all([
        window.electronAPI.goals.getActive(),
        window.electronAPI.phases.getAll(),
        window.electronAPI.subjects.getAll(),
      ]);
      setGoals(g || []);
      setPhases(p || []);
      setSubjects(s || []);
    } catch (err) {
      console.warn('Error loading goals and phases:', err);
    }
  };

  const handleAddGoal = async () => {
    if (!goalForm.target_value || parseFloat(goalForm.target_value) <= 0) {
      addToast('Please enter a valid target value', 'warning');
      return;
    }
    try {
      await window.electronAPI.goals.create({
        ...goalForm,
        target_value: parseFloat(goalForm.target_value),
      });
      setShowAddGoal(false);
      setGoalForm({ type: 'daily', metric: 'study_hours', target_value: '', notes: '' });
      await loadData();
      addToast('Goal created successfully! 🎯', 'success');
    } catch (err: any) {
      addToast(`Failed to create goal: ${err.message}`, 'error');
    }
  };

  // 1-Click Goal Preset
  const handleAddPresetGoal = async (type: string, metric: string, target: number, notes: string) => {
    try {
      await window.electronAPI.goals.create({
        type,
        metric,
        target_value: target,
        notes,
      });
      await loadData();
      addToast(`Added ${type} goal: ${target} ${metric.replace('_', ' ')}!`, 'success');
    } catch (err) {
      addToast('Error adding goal', 'error');
    }
  };

  const handleDeleteGoal = async (id: number) => {
    try {
      await window.electronAPI.goals.delete(id);
      await loadData();
      addToast('Goal removed', 'info');
    } catch (err) {
      addToast('Error deleting goal', 'error');
    }
  };

  const handleAddPhase = async () => {
    if (!phaseForm.name || !phaseForm.start_date || !phaseForm.end_date) {
      addToast('Please fill all required fields', 'warning');
      return;
    }

    try {
      await window.electronAPI.phases.create({
        name: phaseForm.name,
        start_date: phaseForm.start_date,
        end_date: phaseForm.end_date,
        notes: phaseForm.notes || null,
        is_active: phaseForm.is_active,
        subjects: phaseForm.selectedSubjects,
      });
      setShowAddPhase(false);
      setPhaseForm({
        name: '',
        start_date: formatLocalDate(new Date()),
        end_date: formatLocalDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        notes: '',
        is_active: true,
        selectedSubjects: [],
      });
      await loadData();
      addToast('Preparation phase created!', 'success');
    } catch (err: any) {
      addToast(`Failed to create phase: ${err.message}`, 'error');
    }
  };

  const handleDeletePhase = async (id: number) => {
    try {
      await window.electronAPI.phases.delete(id);
      await loadData();
      addToast('Phase deleted', 'info');
    } catch (err) {
      addToast('Error deleting phase', 'error');
    }
  };

  const handleToggleSubjectInPhase = (subjectId: number) => {
    setPhaseForm(prev => {
      const exists = prev.selectedSubjects.some(s => s.subject_id === subjectId);
      if (exists) {
        return {
          ...prev,
          selectedSubjects: prev.selectedSubjects.filter(s => s.subject_id !== subjectId),
        };
      } else {
        return {
          ...prev,
          selectedSubjects: [...prev.selectedSubjects, { subject_id: subjectId, target_completion: 100 }],
        };
      }
    });
  };

  const handleUpdateSubjectTarget = (subjectId: number, target: number) => {
    setPhaseForm(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.map(s => s.subject_id === subjectId ? { ...s, target_completion: target } : s),
    }));
  };

  const metricMeta: Record<string, { label: string; unit: string; icon: string }> = {
    study_hours: { label: 'Study Hours', unit: 'hrs', icon: '⏱️' },
    questions: { label: 'Questions Solved', unit: 'Qs', icon: '📝' },
    pyqs: { label: 'PYQs Solved', unit: 'PYQs', icon: '🎯' },
    revisions: { label: 'Topic Revisions', unit: 'revisions', icon: '🔄' },
    mocks: { label: 'Mock Tests', unit: 'mocks', icon: '📑' },
  };

  const filteredGoals = goals.filter(g => goalFilter === 'all' || g.type === goalFilter);

  // Active Phase calculation
  const activePhase = phases.find(p => p.is_active === 1) || phases[0];
  const todayStr = formatLocalDate(new Date());

  const getDaysRemainingInPhase = (endDateStr: string) => {
    const end = parseLocalDate(endDateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Goals & Preparation Phases</h1>
            <p className="page-subtitle">Set clear study targets, track live consistency, and conquer multi-stage roadmap phases</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'goals' ? (
              <button className="btn btn-primary" onClick={() => setShowAddGoal(true)}>
                + Create Custom Goal
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowAddPhase(true)}>
                + Create Preparation Phase
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="tabs mb-4">
        <button className={`tab ${tab === 'goals' ? 'active' : ''}`} onClick={() => setTab('goals')}>
          🎯 Target Goals ({goals.length})
        </button>
        <button className={`tab ${tab === 'phases' ? 'active' : ''}`} onClick={() => setTab('phases')}>
          🗺️ Preparation Roadmap Phases ({phases.length})
        </button>
      </div>

      {/* TAB 1: GOALS */}
      {tab === 'goals' && (
        <>
          {/* Quick Presets Banner */}
          <div className="card mb-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', padding: 'var(--space-3)' }}>
            <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">
              ⚡ Quick 1-Click Goal Templates
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => handleAddPresetGoal('daily', 'study_hours', 6, 'Deep work study target')}>
                ⏱️ Daily 6h Study Target
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAddPresetGoal('weekly', 'pyqs', 100, 'Weekly PYQ mastery')}>
                🎯 Weekly 100 PYQs
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAddPresetGoal('daily', 'questions', 25, 'Daily question solving')}>
                📝 Daily 25 Questions
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAddPresetGoal('weekly', 'revisions', 5, 'Weekly revision cycle')}>
                🔄 Weekly 5 Topic Revisions
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAddPresetGoal('monthly', 'mocks', 4, 'Full mock test schedule')}>
                📑 Monthly 4 Mock Tests
              </button>
            </div>
          </div>

          {/* Goal Filter Pills */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex gap-2">
              {(['all', 'daily', 'weekly', 'monthly'] as GoalFilter[]).map(f => (
                <button
                  key={f}
                  className={`btn ${goalFilter === f ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setGoalFilter(f)}
                >
                  {f === 'all' ? 'All Goals' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="text-xs text-secondary">
              Active Goals automatically update as you study, solve questions & revise.
            </div>
          </div>

          {/* Goals List */}
          {filteredGoals.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-12) var(--space-4)', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🎯</div>
              <h3 className="text-lg font-bold mb-1">No Active Goals</h3>
              <p className="text-secondary text-sm max-w-md mx-auto mb-4">
                Set daily study targets, weekly PYQ goals, and revision habits to build unstoppable momentum.
              </p>
              <button className="btn btn-primary" onClick={() => setShowAddGoal(true)}>
                + Create Your First Goal
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
              {filteredGoals.map(g => {
                const meta = metricMeta[g.metric] || { label: g.metric.replace('_', ' '), unit: '', icon: '🎯' };
                const percent = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
                const isCompleted = percent >= 100;
                const remaining = Math.max(0, Math.round((g.target_value - g.current_value) * 10) / 10);

                const resetLabel = g.type === 'daily' 
                  ? 'Resets tonight at 12 AM' 
                  : g.type === 'weekly' 
                    ? 'Resets on Sunday night' 
                    : 'Resets at end of month';

                return (
                  <div
                    key={g.id}
                    className="card"
                    style={{
                      padding: 'var(--space-4)',
                      background: 'var(--bg-card)',
                      border: isCompleted ? '1px solid var(--success)' : '1px solid var(--border-primary)',
                      position: 'relative',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{meta.icon}</span>
                        <div>
                          <span className="tag" style={{ background: 'var(--bg-tertiary)', fontWeight: 600 }}>
                            {g.type.toUpperCase()}
                          </span>
                          <span className="font-semibold text-sm ml-2">{meta.label}</span>
                        </div>
                      </div>

                      <button
                        className="btn btn-ghost btn-sm text-secondary"
                        onClick={() => handleDeleteGoal(g.id)}
                        title="Delete Goal"
                      >
                        🗑
                      </button>
                    </div>

                    {/* Progress Values */}
                    <div className="flex items-baseline justify-between mt-3 mb-2">
                      <div>
                        <span className="font-bold text-2xl font-mono">
                          {Math.round(g.current_value * 10) / 10}
                        </span>
                        <span className="text-secondary text-sm ml-1">
                          / {g.target_value} {meta.unit}
                        </span>
                      </div>

                      <div className="font-bold font-mono text-base" style={{ color: isCompleted ? 'var(--success)' : 'var(--accent)' }}>
                        {percent}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="progress-bar progress-bar-lg mb-3">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: isCompleted ? 'var(--success)' : 'linear-gradient(90deg, #4f7df5, #06b6d4)',
                        }}
                      />
                    </div>

                    {/* Footer Status */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                      {isCompleted ? (
                        <span className="tag" style={{ background: 'var(--success-subtle)', color: 'var(--success)', fontWeight: 'bold' }}>
                          🎉 Target Achieved!
                        </span>
                      ) : (
                        <span>{remaining} {meta.unit} left to reach target</span>
                      )}
                      <span>{resetLabel}</span>
                    </div>

                    {g.notes && (
                      <div className="text-xs text-secondary mt-2 italic">
                        "{g.notes}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: PHASES */}
      {tab === 'phases' && (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {/* Active Phase Hero Banner */}
          {activePhase && (
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, rgba(79, 125, 245, 0.12), rgba(16, 185, 129, 0.08))',
                border: '1px solid rgba(79, 125, 245, 0.3)',
                padding: 'var(--space-5)',
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <span className="tag" style={{ background: 'var(--success-subtle)', color: 'var(--success)', fontWeight: 'bold' }}>
                    🟢 CURRENT ACTIVE PHASE
                  </span>
                  <h2 className="text-xl font-bold mt-1">{activePhase.name}</h2>
                  <div className="text-xs text-secondary mt-1">
                    Timeline: {activePhase.start_date} → {activePhase.end_date}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-3xl font-mono text-accent">
                    {(activePhase as any).overall_completion || 0}%
                  </div>
                  <div className="text-xs text-secondary">
                    {getDaysRemainingInPhase(activePhase.end_date) >= 0 
                      ? `⏳ ${getDaysRemainingInPhase(activePhase.end_date)} days remaining`
                      : '🏁 Phase Completed'}
                  </div>
                </div>
              </div>

              {/* Phase Overall Progress */}
              <div className="progress-bar progress-bar-lg mb-4">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${(activePhase as any).overall_completion || 0}%`,
                    background: 'linear-gradient(90deg, #4f7df5, #10b981)',
                  }}
                />
              </div>

              {activePhase.notes && (
                <p className="text-sm text-secondary mb-3">{activePhase.notes}</p>
              )}
            </div>
          )}

          {/* Phase Roadmap List */}
          <div className="flex items-center justify-between mt-2">
            <h3 className="font-bold text-base">All Preparation Phases</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddPhase(true)}>
              + Add Another Phase
            </button>
          </div>

          {phases.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="text-secondary text-sm">No phases created yet. Create a phase to organize your roadmap!</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {phases.map(p => {
                const daysLeft = getDaysRemainingInPhase(p.end_date);
                const overall = (p as any).overall_completion || 0;

                return (
                  <div key={p.id} className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{p.name}</span>
                          {p.is_active ? (
                            <span className="tag" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                              Active
                            </span>
                          ) : daysLeft < 0 ? (
                            <span className="tag" style={{ background: 'var(--bg-tertiary)' }}>
                              Past
                            </span>
                          ) : (
                            <span className="tag" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                              Upcoming
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-secondary mt-1">
                          📅 {p.start_date} to {p.end_date} • {daysLeft >= 0 ? `${daysLeft} days left` : 'Completed'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-bold font-mono text-base">{overall}%</span>
                          <div className="text-xs text-secondary">Syllabus Target</div>
                        </div>
                        <button className="btn btn-ghost btn-sm text-secondary" onClick={() => handleDeletePhase(p.id)}>
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Assigned Subjects in this Phase */}
                    {p.subjects && p.subjects.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                        {p.subjects.map((s: any) => (
                          <div
                            key={s.id || s.subject_id}
                            style={{
                              background: 'var(--bg-tertiary)',
                              padding: 'var(--space-2) var(--space-3)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-primary)',
                            }}
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="flex items-center gap-1 font-semibold truncate">
                                <span className="color-dot" style={{ background: s.subject_color }} />
                                {s.subject_name}
                              </span>
                              <span className="font-mono text-secondary">
                                {s.actual_completion || 0}% / {s.target_completion}%
                              </span>
                            </div>
                            <div className="progress-bar" style={{ height: '5px' }}>
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${Math.min(100, s.actual_completion || 0)}%`,
                                  background: s.subject_color || 'var(--accent)',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="modal-overlay" onClick={() => setShowAddGoal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Set Target Goal</h2>
              <button className="modal-close" onClick={() => setShowAddGoal(false)}>✕</button>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Goal Frequency</label>
                <select
                  className="form-select"
                  value={goalForm.type}
                  onChange={e => setGoalForm(f => ({ ...f, type: e.target.value }))}
                >
                  <option value="daily">Daily Target</option>
                  <option value="weekly">Weekly Target</option>
                  <option value="monthly">Monthly Target</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Metric</label>
                <select
                  className="form-select"
                  value={goalForm.metric}
                  onChange={e => setGoalForm(f => ({ ...f, metric: e.target.value }))}
                >
                  <option value="study_hours">⏱️ Study Hours</option>
                  <option value="pyqs">🎯 PYQs Solved</option>
                  <option value="questions">📝 Total Questions</option>
                  <option value="revisions">🔄 Topic Revisions</option>
                  <option value="mocks">📑 Mock Tests</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Target Value ({metricMeta[goalForm.metric]?.unit || 'units'}) *
              </label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={goalForm.target_value}
                onChange={e => setGoalForm(f => ({ ...f, target_value: e.target.value }))}
                placeholder={goalForm.metric === 'study_hours' ? 'e.g. 6 (hours)' : 'e.g. 50 (questions)'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motivational Note (optional)</label>
              <input
                type="text"
                className="form-input"
                value={goalForm.notes}
                onChange={e => setGoalForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Focus on Engineering Math & Operating Systems"
              />
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Preparation Phase</h2>
              <button className="modal-close" onClick={() => setShowAddPhase(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Phase Name *</label>
              <input
                type="text"
                className="form-input"
                value={phaseForm.name}
                onChange={e => setPhaseForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Phase 1: Core Fundamentals (Math & DSA)"
              />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={phaseForm.start_date}
                  onChange={e => setPhaseForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={phaseForm.end_date}
                  onChange={e => setPhaseForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Target Subjects Selection */}
            <div className="form-group">
              <label className="form-label">Assign Subjects & Set Target Completion</label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
                {subjects.map(s => {
                  const assigned = phaseForm.selectedSubjects.find(sub => sub.subject_id === s.id);
                  return (
                    <div key={s.id} className="flex items-center justify-between p-2 hover:bg-tertiary" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={!!assigned}
                          onChange={() => handleToggleSubjectInPhase(s.id)}
                        />
                        <span className="color-dot" style={{ background: s.color }} />
                        <span>{s.name}</span>
                      </label>

                      {assigned && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-secondary">Target:</span>
                          <input
                            type="number"
                            min="10"
                            max="100"
                            step="10"
                            value={assigned.target_completion}
                            onChange={e => handleUpdateSubjectTarget(s.id, parseInt(e.target.value) || 100)}
                            className="form-input text-xs"
                            style={{ width: '65px', padding: '2px 6px', textAlign: 'center' }}
                          />
                          <span className="text-xs text-secondary">%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phase Strategy / Notes</label>
              <textarea
                className="form-textarea"
                value={phaseForm.notes}
                onChange={e => setPhaseForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Key objectives, milestones, mock targets during this phase..."
              />
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={phaseForm.is_active}
                  onChange={e => setPhaseForm(f => ({ ...f, is_active: e.target.checked }))}
                />
                <span>Set as current active roadmap phase</span>
              </label>
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
