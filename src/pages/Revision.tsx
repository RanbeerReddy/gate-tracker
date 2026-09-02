import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Revision, Subject, Topic } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useTimer } from '../contexts/TimerContext';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';

type RevisionTab = 'due' | 'schedule' | 'history' | 'matrix';

export default function RevisionPage() {
  const navigate = useNavigate();
  const { startSession } = useTimer();
  const { addToast } = useToast();

  const [dueRevisions, setDueRevisions] = useState<Revision[]>([]);
  const [schedule, setSchedule] = useState<Revision[]>([]);
  const [history, setHistory] = useState<Revision[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [tab, setTab] = useState<RevisionTab>('due');
  
  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Revision | null>(null);

  // Form states
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>('');
  const [formTopics, setFormTopics] = useState<Topic[]>([]);
  const [intervalDays, setIntervalDays] = useState<number>(1);
  const [customDate, setCustomDate] = useState<string>(formatLocalDate(new Date()));
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);
  const [scheduleNotes, setScheduleNotes] = useState<string>('');

  // Log Form
  const [logRating, setLogRating] = useState<number>(3);
  const [logConfidence, setLogConfidence] = useState<number>(60);
  const [logNotes, setLogNotes] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [due, sched, allLogs, subs] = await Promise.all([
        window.electronAPI.revisions.getDue(),
        window.electronAPI.revisions.getSchedule(),
        window.electronAPI.revisions.getAll({}),
        window.electronAPI.subjects.getAll(),
      ]);
      setDueRevisions(due || []);
      setSchedule(sched || []);
      setHistory(allLogs || []);
      setSubjects(subs || []);

      // Load all topics for retention matrix
      const topicsList: Topic[] = [];
      for (const s of subs || []) {
        const t = await window.electronAPI.topics.getBySubject(s.id);
        topicsList.push(...(t || []));
      }
      setAllTopics(topicsList);
    } catch (err) {
      console.warn('Error loading revision data:', err);
    }
  };

  const handleSubjectChange = async (subjectId: number | '') => {
    setSelectedSubjectId(subjectId);
    setSelectedTopicId('');
    if (subjectId) {
      const t = await window.electronAPI.topics.getBySubject(subjectId);
      setFormTopics(t || []);
    } else {
      setFormTopics([]);
    }
  };

  // Open Schedule Modal with optional preselection
  const openScheduleModal = (subjectId?: number, topicId?: number) => {
    if (subjectId) {
      handleSubjectChange(subjectId);
      if (topicId) setSelectedTopicId(topicId);
    } else {
      setSelectedSubjectId('');
      setSelectedTopicId('');
      setFormTopics([]);
    }
    setIntervalDays(1);
    setIsCustomDate(false);
    setScheduleNotes('');
    setShowScheduleModal(true);
  };

  // Schedule a revision (preset or custom date)
  const handleCreateSchedule = async () => {
    if (!selectedTopicId) {
      addToast('Please select a topic to schedule', 'warning');
      return;
    }

    let targetDateStr = customDate;
    if (!isCustomDate) {
      const d = new Date();
      d.setDate(d.getDate() + intervalDays);
      targetDateStr = formatLocalDate(d);
    }

    try {
      await window.electronAPI.revisions.create({
        topic_id: typeof selectedTopicId === 'string' ? parseInt(selectedTopicId) : selectedTopicId,
        next_revision_date: targetDateStr,
        notes: scheduleNotes || null,
      });

      setShowScheduleModal(false);
      await loadData();
      addToast(`Revision scheduled for ${targetDateStr}`, 'success');
    } catch (err: any) {
      addToast(`Failed to schedule: ${err.message}`, 'error');
    }
  };

  // Log completed revision
  const handleLogRevision = async () => {
    if (!selectedTopicId) {
      addToast('Please select a topic', 'warning');
      return;
    }

    try {
      await window.electronAPI.revisions.create({
        topic_id: typeof selectedTopicId === 'string' ? parseInt(selectedTopicId) : selectedTopicId,
        performance_rating: logRating,
        confidence: logConfidence,
        notes: logNotes || null,
      });

      setShowLogModal(false);
      await loadData();
      addToast('Revision completed and next date auto-scheduled! 🎯', 'success');
    } catch (err: any) {
      addToast(`Failed to log: ${err.message}`, 'error');
    }
  };

  // Fast 1-click rating for Due Revisions
  const handleQuickReview = async (topicId: number, rating: number) => {
    try {
      await window.electronAPI.revisions.create({
        topic_id: topicId,
        performance_rating: rating,
        confidence: rating * 20,
        notes: `Quick review: ${rating}⭐`,
      });
      await loadData();
      addToast(`Revision logged (${rating}⭐) — Next cycle scheduled!`, 'success');
    } catch (err) {
      addToast('Error saving revision', 'error');
    }
  };

  // Reschedule existing revision
  const handleQuickReschedule = async (revisionId: number, daysToAdd: number) => {
    const next = new Date();
    next.setDate(next.getDate() + daysToAdd);
    const dateStr = formatLocalDate(next);
    
    try {
      await window.electronAPI.revisions.update(revisionId, {
        next_revision_date: dateStr,
      });
      setRescheduleTarget(null);
      await loadData();
      addToast(`Postponed to ${dateStr}`, 'info');
    } catch (err) {
      addToast('Error rescheduling', 'error');
    }
  };

  // 1-Click Launch in Timer
  const handleStartTimerForRevision = async (subjectId?: number | null, topicId?: number | null, subjectName?: string, topicName?: string) => {
    if (!subjectId) {
      addToast('No subject associated', 'warning');
      return;
    }
    await startSession({
      subjectId,
      topicId: topicId || undefined,
      activityType: 'revision',
      subjectName: subjectName || 'Revision',
      topicName: topicName || undefined,
    });
    addToast(`Revision timer started for ${topicName || subjectName}!`, 'success');
    navigate('/study');
  };

  const todayStr = formatLocalDate(new Date());

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Revision & Spaced Repetition</h1>
            <p className="page-subtitle">Schedule, track, and master topic retention across your GATE syllabus</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary" onClick={() => setShowLogModal(true)}>
              ✓ Log Past Revision
            </button>
            <button className="btn btn-primary" onClick={() => openScheduleModal()}>
              + Schedule Revision
            </button>
          </div>
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="stats-grid mb-5">
        <div className="stat-card">
          <div className="stat-label">Due Today</div>
          <div className="stat-value" style={{ color: dueRevisions.length > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {dueRevisions.length}
          </div>
          <div className="text-xs text-secondary mt-1">Topics needing review</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Scheduled</div>
          <div className="stat-value text-accent">{schedule.length}</div>
          <div className="text-xs text-secondary mt-1">Upcoming revision queue</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Completed Revisions</div>
          <div className="stat-value text-success">{history.length}</div>
          <div className="text-xs text-secondary mt-1">Logged revision sessions</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Retention Index</div>
          <div className="stat-value">
            {allTopics.length > 0 
              ? `${Math.round((allTopics.filter(t => t.status === 'strong').length / allTopics.length) * 100)}%`
              : '0%'}
          </div>
          <div className="text-xs text-secondary mt-1">Strong / Mastered topics</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs mb-4">
        <button className={`tab ${tab === 'due' ? 'active' : ''}`} onClick={() => setTab('due')}>
          ⚡ Due Now ({dueRevisions.length})
        </button>
        <button className={`tab ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>
          📅 Schedule Queue ({schedule.length})
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          📜 Completion History ({history.length})
        </button>
        <button className={`tab ${tab === 'matrix' ? 'active' : ''}`} onClick={() => setTab('matrix')}>
          🗺️ Topic Retention Matrix
        </button>
      </div>

      {/* TAB 1: Due Now */}
      {tab === 'due' && (
        dueRevisions.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-12) var(--space-4)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🎉</div>
            <h3 className="text-lg font-bold mb-1">All Caught Up!</h3>
            <p className="text-secondary text-sm max-w-md mx-auto mb-4">
              No revisions are due today. Great work staying ahead of the forgetting curve!
            </p>
            <button className="btn btn-primary" onClick={() => openScheduleModal()}>
              + Schedule Upcoming Topic Revision
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {dueRevisions.map(r => {
              const isOverdue = r.next_revision_date && r.next_revision_date < todayStr;
              return (
                <div
                  key={r.id}
                  className="card"
                  style={{
                    padding: 'var(--space-4)',
                    borderLeft: `4px solid ${r.subject_color || 'var(--warning)'}`,
                    background: 'var(--bg-card)',
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="color-dot" style={{ background: r.subject_color }} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                          {r.subject_name}
                        </span>
                        {isOverdue && (
                          <span className="tag" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)' }}>
                            Overdue ({r.next_revision_date})
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-base">{r.topic_name}</div>
                      
                      <div className="flex items-center gap-3 text-xs text-tertiary mt-2">
                        <span>Cycle #{r.revision_number}</span>
                        <span>•</span>
                        <span>Due: {r.next_revision_date === todayStr ? 'Today' : r.next_revision_date}</span>
                        {r.topic_status && (
                          <>
                            <span>•</span>
                            <span className="tag" style={{ background: 'var(--bg-tertiary)' }}>
                              {r.topic_status.replace('_', ' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* 1-Click Timer */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleStartTimerForRevision(r.subject_id || (r as any).topic_subject_id, r.topic_id, r.subject_name, r.topic_name)}
                        title="Start active revision with study timer"
                      >
                        ⏱️ Revise in Timer
                      </button>

                      {/* 1-Click Rating */}
                      <div className="flex items-center gap-1 bg-tertiary px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <span className="text-xs text-secondary mr-1">Rate:</span>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', fontSize: '11px' }}
                            onClick={() => handleQuickReview(r.topic_id, n)}
                            title={n <= 2 ? 'Hard (Review tomorrow)' : n === 3 ? 'Medium' : 'Mastered!'}
                          >
                            {n}⭐
                          </button>
                        ))}
                      </div>

                      {/* Postpone */}
                      <div style={{ position: 'relative' }}>
                        <button
                          className="btn btn-ghost btn-sm text-secondary"
                          onClick={() => setRescheduleTarget(rescheduleTarget?.id === r.id ? null : r)}
                          title="Postpone / Reschedule"
                        >
                          ⏳ Postpone ▾
                        </button>
                        {rescheduleTarget?.id === r.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              zIndex: 50,
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-primary)',
                              borderRadius: 'var(--radius-md)',
                              boxShadow: 'var(--shadow-lg)',
                              padding: 'var(--space-2)',
                              minWidth: '150px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            <button className="btn btn-ghost btn-sm w-full text-left" onClick={() => handleQuickReschedule(r.id, 1)}>
                              +1 Day (Tomorrow)
                            </button>
                            <button className="btn btn-ghost btn-sm w-full text-left" onClick={() => handleQuickReschedule(r.id, 3)}>
                              +3 Days
                            </button>
                            <button className="btn btn-ghost btn-sm w-full text-left" onClick={() => handleQuickReschedule(r.id, 7)}>
                              +1 Week
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* TAB 2: Schedule Queue */}
      {tab === 'schedule' && (
        <div className="card" style={{ padding: 0 }}>
          {schedule.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="text-secondary text-sm">No upcoming revisions scheduled. Click "+ Schedule Revision" to add one!</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Subject</th>
                  <th>Next Due</th>
                  <th>Cycle #</th>
                  <th>Confidence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(r => {
                  const isDue = r.next_revision_date && r.next_revision_date <= todayStr;
                  return (
                    <tr key={r.id}>
                      <td className="font-semibold">{r.topic_name}</td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className="color-dot" style={{ background: r.subject_color }} />
                          {r.subject_name}
                        </span>
                      </td>
                      <td className={isDue ? 'text-warning font-bold' : 'text-secondary'}>
                        {r.next_revision_date === todayStr ? '⚡ Today' : r.next_revision_date || '—'}
                      </td>
                      <td className="font-mono text-sm">Revision #{r.revision_number}</td>
                      <td>
                        <div className="flex items-center gap-2" style={{ width: '120px' }}>
                          <div className="progress-bar flex-1">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${r.topic_confidence || 50}%`,
                                background: (r.topic_confidence || 0) >= 80 ? 'var(--success)' : (r.topic_confidence || 0) >= 50 ? 'var(--accent)' : 'var(--warning)',
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono">{r.topic_confidence || 0}%</span>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleStartTimerForRevision(r.subject_id || (r as any).topic_subject_id, r.topic_id, r.subject_name, r.topic_name)}
                        >
                          ⏱️ Revise
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: History */}
      {tab === 'history' && (
        <div className="card" style={{ padding: 0 }}>
          {history.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="text-secondary text-sm">No revision history logged yet. Complete revisions from "Due Now" or log past sessions!</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Topic</th>
                  <th>Subject</th>
                  <th>Rating</th>
                  <th>Confidence</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td className="font-mono text-xs text-secondary">
                      {h.revision_date ? parseLocalDate(h.revision_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="font-semibold">{h.topic_name || `Topic #${h.topic_id}`}</td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="color-dot" style={{ background: h.subject_color || 'var(--accent)' }} />
                        {h.subject_name || '—'}
                      </span>
                    </td>
                    <td>
                      {h.performance_rating ? (
                        <span className="font-medium text-warning">
                          {'★'.repeat(h.performance_rating)}{'☆'.repeat(5 - h.performance_rating)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="font-mono text-xs">{h.confidence ? `${h.confidence}%` : '—'}</td>
                    <td className="text-xs text-secondary max-w-xs truncate">{h.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 4: Topic Retention Matrix */}
      {tab === 'matrix' && (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {subjects.map(s => {
            const subjectTopics = allTopics.filter(t => t.subject_id === s.id);
            if (subjectTopics.length === 0) return null;

            return (
              <div key={s.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-2">
                    <span className="color-dot" style={{ background: s.color }} />
                    <span className="font-bold text-base">{s.name}</span>
                    <span className="text-xs text-secondary">({subjectTopics.length} topics)</span>
                  </div>
                  <button className="btn btn-ghost btn-sm text-accent" onClick={() => openScheduleModal(s.id)}>
                    + Schedule Topic in {s.name}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-2)' }}>
                  {subjectTopics.map(t => {
                    const statusColor = t.status === 'strong' ? 'var(--success)' : t.status === 'needs_revision' ? 'var(--warning)' : t.status === 'completed' ? 'var(--info)' : 'var(--text-tertiary)';
                    return (
                      <div
                        key={t.id}
                        style={{
                          background: 'var(--bg-tertiary)',
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'between',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="font-medium text-xs truncate" title={t.name}>{t.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="tag" style={{ background: `${statusColor}20`, color: statusColor, fontSize: '10px', padding: '1px 5px' }}>
                              {t.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-secondary font-mono">{t.confidence || 0}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', fontSize: '11px' }}
                            onClick={() => openScheduleModal(s.id, t.id)}
                            title="Schedule revision"
                          >
                            📅
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', fontSize: '11px' }}
                            onClick={() => handleStartTimerForRevision(s.id, t.id, s.name, t.name)}
                            title="Start timer now"
                          >
                            ⏱️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Revision Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Schedule Revision</h2>
              <button className="modal-close" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select
                className="form-select"
                value={selectedSubjectId}
                onChange={e => handleSubjectChange(e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Topic *</label>
              <select
                className="form-select"
                value={selectedTopicId}
                onChange={e => setSelectedTopicId(e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">Select topic...</option>
                {formTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Revision Frequency / Interval Presets */}
            <div className="form-group">
              <label className="form-label">When to Revise?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                {[
                  { label: 'Tomorrow (+1d)', days: 1 },
                  { label: 'In 3 Days', days: 3 },
                  { label: 'Weekly (+7d)', days: 7 },
                  { label: 'Bi-Weekly (+14d)', days: 14 },
                  { label: 'Monthly (+30d)', days: 30 },
                  { label: 'Custom Date', days: 0, custom: true },
                ].map(preset => {
                  const isSelected = preset.custom ? isCustomDate : (!isCustomDate && intervalDays === preset.days);
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => {
                        if (preset.custom) {
                          setIsCustomDate(true);
                        } else {
                          setIsCustomDate(false);
                          setIntervalDays(preset.days);
                        }
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Date Picker */}
            {isCustomDate && (
              <div className="form-group">
                <label className="form-label">Specific Target Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={customDate}
                  min={todayStr}
                  onChange={e => setCustomDate(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Revision Focus / Notes (optional)</label>
              <textarea
                className="form-textarea"
                value={scheduleNotes}
                onChange={e => setScheduleNotes(e.target.value)}
                placeholder="Key concepts or formulas to focus on during this review..."
              />
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateSchedule}>Save Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Completed Revision Modal */}
      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Log Completed Revision</h2>
              <button className="modal-close" onClick={() => setShowLogModal(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select
                className="form-select"
                value={selectedSubjectId}
                onChange={e => handleSubjectChange(e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Topic *</label>
              <select
                className="form-select"
                value={selectedTopicId}
                onChange={e => setSelectedTopicId(e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">Select topic...</option>
                {formTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Performance Rating (1-5 ⭐)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`btn ${logRating === n ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => {
                      setLogRating(n);
                      setLogConfidence(n * 20);
                    }}
                  >
                    {n} ⭐
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confidence: {logConfidence}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={logConfidence}
                onChange={e => setLogConfidence(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={logNotes}
                onChange={e => setLogNotes(e.target.value)}
                placeholder="What did you revise? Any doubts cleared?"
              />
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowLogModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleLogRevision}>Save Revision Log</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
