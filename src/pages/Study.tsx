import React, { useState, useEffect } from 'react';
import { useTimer } from '../contexts/TimerContext';
import { useToast } from '../contexts/ToastContext';
import { Subject, Topic, Subtopic, ACTIVITY_TYPES, ActivityType, StudySession } from '../types';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function Study() {
  const { timer, startSession, pauseSession, resumeSession, finishSession, formatTime } = useTimer();
  const { addToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('learning');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadSubjects();
    loadRecentSessions();
  }, []);

  const loadSubjects = async () => {
    const subs = await window.electronAPI.subjects.getAll();
    setSubjects(subs);
    // Restore last used subject
    const lastSubject = await window.electronAPI.settings.get('last_subject_id');
    const lastTopic = await window.electronAPI.settings.get('last_topic_id');
    const lastActivity = await window.electronAPI.settings.get('last_activity_type');
    
    if (lastSubject) {
      setSelectedSubject(parseInt(lastSubject));
      const t = await window.electronAPI.topics.getBySubject(parseInt(lastSubject));
      setTopics(t);
      if (lastTopic) setSelectedTopic(parseInt(lastTopic));
    }
    if (lastActivity) setSelectedActivity(lastActivity as ActivityType);
  };

  const loadRecentSessions = async () => {
    const s = await window.electronAPI.sessions.getAll({ limit: 20 });
    setSessions(s);
  };

  const handleSubjectChange = async (id: number) => {
    setSelectedSubject(id);
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    setSubtopics([]);
    if (id) {
      const t = await window.electronAPI.topics.getBySubject(id);
      setTopics(t);
    } else {
      setTopics([]);
    }
  };

  const handleTopicChange = async (id: number) => {
    setSelectedTopic(id);
    setSelectedSubtopic(null);
    if (id) {
      const st = await window.electronAPI.subtopics.getByTopic(id);
      setSubtopics(st);
    } else {
      setSubtopics([]);
    }
  };

  const handleStart = async () => {
    if (!selectedSubject) {
      addToast('Please select a subject', 'warning');
      return;
    }
    const subject = subjects.find(s => s.id === selectedSubject);
    const topic = topics.find(t => t.id === selectedTopic);
    
    // Save last used selections
    window.electronAPI.settings.set('last_subject_id', String(selectedSubject));
    if (selectedTopic) window.electronAPI.settings.set('last_topic_id', String(selectedTopic));
    window.electronAPI.settings.set('last_activity_type', selectedActivity);

    await startSession({
      subjectId: selectedSubject,
      topicId: selectedTopic || undefined,
      subtopicId: selectedSubtopic || undefined,
      activityType: selectedActivity,
      subjectName: subject?.name || '',
      topicName: topic?.name,
    });
    addToast('Study session started!', 'success');
  };

  const handleDeleteSession = async (id: number) => {
    await window.electronAPI.sessions.delete(id);
    loadRecentSessions();
    addToast('Session deleted', 'info');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Study</h1>
        <p className="page-subtitle">Start a study session or view your history</p>
      </div>

      {!timer.isRunning ? (
        /* Start Session Form */
        <div className="card" style={{ maxWidth: '600px' }}>
          <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
            Start Study Session
          </h3>
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <select
              className="form-select"
              value={selectedSubject || ''}
              onChange={e => handleSubjectChange(parseInt(e.target.value))}
            >
              <option value="">Select subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {topics.length > 0 && (
            <div className="form-group">
              <label className="form-label">Topic</label>
              <select
                className="form-select"
                value={selectedTopic || ''}
                onChange={e => handleTopicChange(parseInt(e.target.value))}
              >
                <option value="">Select topic (optional)...</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {subtopics.length > 0 && (
            <div className="form-group">
              <label className="form-label">Subtopic</label>
              <select
                className="form-select"
                value={selectedSubtopic || ''}
                onChange={e => setSelectedSubtopic(parseInt(e.target.value) || null)}
              >
                <option value="">Select subtopic (optional)...</option>
                {subtopics.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Activity Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {ACTIVITY_TYPES.map(at => (
                <button
                  key={at.value}
                  className={`btn ${selectedActivity === at.value ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setSelectedActivity(at.value)}
                >
                  {at.icon} {at.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg w-full" onClick={handleStart} style={{ marginTop: 'var(--space-4)' }}>
            ⏱️ Start Session
          </button>
        </div>
      ) : (
        /* Active Timer Display */
        <div className="card" style={{ textAlign: 'center', maxWidth: '600px' }}>
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <span className="tag" style={{
              background: timer.isPaused ? 'var(--warning-subtle)' : 'var(--success-subtle)',
              color: timer.isPaused ? 'var(--warning)' : 'var(--success)',
            }}>
              {timer.isPaused ? '⏸ Paused' : '🟢 Studying'}
            </span>
          </div>
          <div className="timer-display" style={{ margin: 'var(--space-4) 0' }}>
            {formatTime(timer.elapsed)}
          </div>
          <div className="text-secondary">
            <strong>{timer.subjectName}</strong>
            {timer.topicName && <span> → {timer.topicName}</span>}
          </div>
          <div className="text-tertiary text-sm mt-2">
            {ACTIVITY_TYPES.find(a => a.value === timer.activityType)?.icon}{' '}
            {ACTIVITY_TYPES.find(a => a.value === timer.activityType)?.label}
          </div>
          <div className="timer-controls">
            {timer.isPaused ? (
              <button className="btn btn-success btn-lg" onClick={resumeSession}>▶ Resume</button>
            ) : (
              <button className="btn btn-secondary btn-lg" onClick={pauseSession}>⏸ Pause</button>
            )}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="section" style={{ marginTop: 'var(--space-8)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="section-title" style={{ marginBottom: 0 }}>Recent Sessions</div>
        </div>
        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <div className="empty-state-title">No sessions yet</div>
            <div className="empty-state-text">Start your first study session to begin tracking</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Topic</th>
                  <th>Activity</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td className="text-sm">
                      {new Date(s.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <div className="text-xs text-tertiary">
                        {new Date(s.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="color-dot" style={{ background: s.subject_color }} />
                        {s.subject_name}
                      </span>
                    </td>
                    <td className="text-secondary">{s.topic_name || '—'}</td>
                    <td>
                      <span className="tag" style={{ background: 'var(--bg-tertiary)' }}>
                        {ACTIVITY_TYPES.find(a => a.value === s.activity_type)?.icon}{' '}
                        {ACTIVITY_TYPES.find(a => a.value === s.activity_type)?.label}
                      </span>
                    </td>
                    <td className="font-mono font-medium">{formatDuration(s.duration_seconds)}</td>
                    <td>{s.questions_solved || '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteSession(s.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
