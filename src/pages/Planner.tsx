import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlannedSession, Subject, Topic, ACTIVITY_TYPES, ActivityType } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useTimer } from '../contexts/TimerContext';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';

export default function Planner() {
  const navigate = useNavigate();
  const { startSession } = useTimer();
  const { addToast } = useToast();

  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [planned, setPlanned] = useState<PlannedSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'cards'>('timeline');

  // Real-time live clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Form
  const [form, setForm] = useState({
    subject_id: '' as any,
    topic_id: '' as any,
    activity_type: 'learning' as ActivityType,
    start_time: '09:00',
    end_time: '11:00',
    notes: '',
  });

  // Ticking live clock
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    try {
      const [p, s] = await Promise.all([
        window.electronAPI.planner.getByDate(date),
        window.electronAPI.subjects.getAll(),
      ]);
      setPlanned(p || []);
      setSubjects(s || []);
    } catch (err) {
      console.warn('Error loading planner:', err);
    }
  };

  const handleFormSubjectChange = async (subjectId: number) => {
    setForm(f => ({ ...f, subject_id: subjectId, topic_id: '' }));
    if (subjectId) {
      const t = await window.electronAPI.topics.getBySubject(subjectId);
      setTopics(t || []);
    } else {
      setTopics([]);
    }
  };

  const handleAdd = async () => {
    if (!form.subject_id) {
      addToast('Please select a subject', 'warning');
      return;
    }
    try {
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
      await loadData();
      addToast('Study block scheduled! 📅', 'success');
    } catch (err: any) {
      addToast(`Error adding block: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await window.electronAPI.planner.delete(id);
      await loadData();
      addToast('Block removed', 'info');
    } catch (err) {
      addToast('Error removing block', 'error');
    }
  };

  const handleToggleComplete = async (block: PlannedSession) => {
    try {
      await window.electronAPI.planner.update(block.id, {
        is_completed: block.is_completed ? 0 : 1,
      });
      await loadData();
      addToast(block.is_completed ? 'Marked incomplete' : 'Block completed! ✓', 'success');
    } catch (err) {
      addToast('Error updating block', 'error');
    }
  };

  // 1-Click Launch Block in Timer
  const handleLaunchInTimer = async (block: PlannedSession) => {
    try {
      await startSession({
        subjectId: block.subject_id,
        topicId: block.topic_id || undefined,
        activityType: block.activity_type,
        subjectName: block.subject_name || 'Study Block',
        topicName: block.topic_name || undefined,
      });
      addToast(`Timer started for ${block.subject_name} (${block.activity_type.toUpperCase()})!`, 'success');
      navigate('/study');
    } catch (err) {
      addToast('Error starting timer', 'error');
    }
  };

  // Quick Preset Add
  const handleAddPreset = async (startTime: string, endTime: string, activity: ActivityType, defaultSubjectName?: string) => {
    const targetSubj = subjects.find(s => s.name.toLowerCase().includes((defaultSubjectName || '').toLowerCase())) || subjects[0];
    if (!targetSubj) {
      addToast('No subjects found. Create a subject first.', 'warning');
      return;
    }

    try {
      await window.electronAPI.planner.create({
        date,
        subject_id: targetSubj.id,
        activity_type: activity,
        start_time: startTime,
        end_time: endTime,
        notes: `Scheduled ${activity.toUpperCase()}`,
      });
      await loadData();
      addToast(`Added ${activity.toUpperCase()} block (${startTime} - ${endTime})!`, 'success');
    } catch (err: any) {
      addToast(`Error: ${err.message}`, 'error');
    }
  };

  const changeDate = (offset: number) => {
    const d = parseLocalDate(date);
    d.setDate(d.getDate() + offset);
    setDate(formatLocalDate(d));
  };

  const isToday = date === formatLocalDate(new Date());

  // Time conversion helpers
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Duration calculations
  const calculateDurationMinutes = (startStr: string, endStr: string) => {
    const start = timeToMinutes(startStr);
    const end = timeToMinutes(endStr);
    return Math.max(0, end - start);
  };

  const totalPlannedMinutes = planned.reduce((acc, p) => acc + calculateDurationMinutes(p.start_time, p.end_time), 0);
  const totalCompletedMinutes = planned.filter(p => p.is_completed).reduce((acc, p) => acc + calculateDurationMinutes(p.start_time, p.end_time), 0);

  const formatHoursMins = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Current minute of the day for the live clock needle
  const currentMinutesOfDay = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
  const currentClockAngle = (currentMinutesOfDay / (24 * 60)) * 360;

  // Check if currently active block exists
  const activeCurrentBlock = isToday ? planned.find(p => {
    const s = timeToMinutes(p.start_time);
    const e = timeToMinutes(p.end_time);
    return currentMinutesOfDay >= s && currentMinutesOfDay <= e;
  }) : null;

  // Helper to get color for activity
  const getActivityColor = (activity: ActivityType, defaultColor?: string) => {
    switch (activity) {
      case 'learning': return '#3B82F6';
      case 'revision': return '#A855F7';
      case 'pyqs': return '#F59E0B';
      case 'practice': return '#10B981';
      case 'mock_test': return '#EF4444';
      case 'analysis': return '#06B6D4';
      case 'notes': return '#EAB308';
      case 'doubt_solving': return '#EC4899';
      default: return defaultColor || '#4F7DF5';
    }
  };

  return (
    <div className="page">
      {/* Top Header */}
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Daily Study Planner & Clock</h1>
            <p className="page-subtitle">Schedule, visualize on 24-hour dial, and execute your Learning, Revision & PYQ blocks</p>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-card p-1 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => changeDate(-1)} title="Previous Day">←</button>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ width: '140px', textAlign: 'center', border: 'none', background: 'transparent', padding: '4px' }}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => changeDate(1)} title="Next Day">→</button>
            </div>

            {!isToday && (
              <button className="btn btn-secondary btn-sm" onClick={() => setDate(formatLocalDate(new Date()))}>
                Today
              </button>
            )}

            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              + Add Study Block
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section: Live Big Clock & 24-Hour Visual Dial */}
      <div
        className="card mb-5"
        style={{
          background: 'linear-gradient(145deg, #141724 0%, #1a1d2e 100%)',
          border: '1px solid var(--border-primary)',
          padding: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)', alignItems: 'center' }}>
          
          {/* LEFT: Live Glowing Digital Clock & Day Summary */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="tag" style={{ background: isToday ? 'var(--success-subtle)' : 'var(--accent-subtle)', color: isToday ? 'var(--success)' : 'var(--accent)', fontWeight: 'bold' }}>
                {isToday ? '🟢 LIVE TIME' : `PLAN FOR ${date}`}
              </span>
              <span className="text-xs text-secondary font-mono">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Big Digital Clock */}
            <div
              className="font-mono font-bold"
              style={{
                fontSize: '3rem',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                textShadow: '0 0 20px rgba(79, 125, 245, 0.4)',
              }}
            >
              {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>

            {/* Currently Active Block Banner */}
            {activeCurrentBlock && (
              <div
                className="mt-3 p-3 rounded"
                style={{
                  background: 'rgba(79, 125, 245, 0.15)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                    <span className="animate-pulse">⚡</span> CURRENTLY SCHEDULED
                  </div>
                  <div className="font-bold text-sm text-primary mt-0.5">
                    {activeCurrentBlock.subject_name} • {activeCurrentBlock.activity_type.toUpperCase()}
                  </div>
                  <div className="text-xs text-secondary font-mono">
                    {activeCurrentBlock.start_time} - {activeCurrentBlock.end_time}
                  </div>
                </div>

                <button className="btn btn-primary btn-sm" onClick={() => handleLaunchInTimer(activeCurrentBlock)}>
                  ▶ Start Now
                </button>
              </div>
            )}

            {/* Daily Summary Metrics */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <div>
                <div className="text-xs text-secondary">Planned Total</div>
                <div className="font-bold font-mono text-lg text-accent">
                  {formatHoursMins(totalPlannedMinutes)}
                </div>
              </div>

              <div>
                <div className="text-xs text-secondary">Completed</div>
                <div className="font-bold font-mono text-lg text-success">
                  {formatHoursMins(totalCompletedMinutes)}
                </div>
              </div>

              <div>
                <div className="text-xs text-secondary">Completion Rate</div>
                <div className="font-bold font-mono text-lg">
                  {totalPlannedMinutes > 0 ? `${Math.round((totalCompletedMinutes / totalPlannedMinutes) * 100)}%` : '0%'}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: 24-Hour Circular Time Dial (SVG) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '260px', height: '260px' }}>
              <svg width="260" height="260" viewBox="0 0 260 260">
                <defs>
                  <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Clock Background Ring */}
                <circle cx="130" cy="130" r="115" fill="#121420" stroke="var(--border-primary)" strokeWidth="2" />
                <circle cx="130" cy="130" r="85" fill="#0d0f18" stroke="var(--border-primary)" strokeWidth="1" strokeDasharray="3 3" />

                {/* Hour Markers (24 Hours) */}
                {[0, 3, 6, 9, 12, 15, 18, 21].map(h => {
                  const angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
                  const x1 = 130 + 105 * Math.cos(angle);
                  const y1 = 130 + 105 * Math.sin(angle);
                  const xText = 130 + 95 * Math.cos(angle);
                  const yText = 130 + 95 * Math.sin(angle);

                  const label = h === 0 ? '00:00' : h === 12 ? '12:00' : `${h}:00`;

                  return (
                    <g key={h}>
                      <line x1={x1} y1={y1} x2={130 + 115 * Math.cos(angle)} y2={130 + 115 * Math.sin(angle)} stroke="var(--border-secondary)" strokeWidth="2" />
                      <text
                        x={xText}
                        y={yText}
                        fill="var(--text-tertiary)"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* Planned Study Block Arcs */}
                {planned.map(p => {
                  const startMin = timeToMinutes(p.start_time);
                  const endMin = timeToMinutes(p.end_time);
                  if (endMin <= startMin) return null;

                  const startAngle = (startMin / (24 * 60)) * 2 * Math.PI - Math.PI / 2;
                  const endAngle = (endMin / (24 * 60)) * 2 * Math.PI - Math.PI / 2;
                  const largeArc = (endMin - startMin) > (12 * 60) ? 1 : 0;

                  const r = 100;
                  const x1 = 130 + r * Math.cos(startAngle);
                  const y1 = 130 + r * Math.sin(startAngle);
                  const x2 = 130 + r * Math.cos(endAngle);
                  const y2 = 130 + r * Math.sin(endAngle);

                  const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
                  const blockColor = getActivityColor(p.activity_type, p.subject_color);

                  return (
                    <path
                      key={p.id}
                      d={pathData}
                      fill="none"
                      stroke={blockColor}
                      strokeWidth="14"
                      strokeLinecap="round"
                      opacity={p.is_completed ? 0.4 : 0.9}
                    >
                      <title>{`${p.subject_name} (${p.start_time} - ${p.end_time}): ${p.activity_type}`}</title>
                    </path>
                  );
                })}

                {/* Live Current Time Hand / Needle (Only if looking at Today) */}
                {isToday && (
                  <g filter="url(#needleGlow)">
                    {(() => {
                      const rad = (currentClockAngle - 90) * (Math.PI / 180);
                      const nx = 130 + 110 * Math.cos(rad);
                      const ny = 130 + 110 * Math.sin(rad);
                      return (
                        <>
                          <line x1="130" y1="130" x2={nx} y2={ny} stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx={nx} cy={ny} r="4" fill="#38bdf8" />
                        </>
                      );
                    })()}
                  </g>
                )}

                {/* Center Hub */}
                <circle cx="130" cy="130" r="16" fill="var(--bg-tertiary)" stroke="var(--border-primary)" strokeWidth="2" />
                <circle cx="130" cy="130" r="4" fill="var(--accent)" />
              </svg>
            </div>

            {/* Dial Legend */}
            <div className="flex items-center gap-3 mt-2 text-xs flex-wrap justify-center">
              <span className="flex items-center gap-1"><span className="color-dot" style={{ background: '#3B82F6' }} /> Learning</span>
              <span className="flex items-center gap-1"><span className="color-dot" style={{ background: '#A855F7' }} /> Revision</span>
              <span className="flex items-center gap-1"><span className="color-dot" style={{ background: '#F59E0B' }} /> PYQs</span>
              <span className="flex items-center gap-1"><span className="color-dot" style={{ background: '#10B981' }} /> Practice</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Presets Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">
            ⚡ Quick Presets:
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => handleAddPreset('09:00', '12:00', 'learning')}>
            + Morning Deep Study (9-12)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleAddPreset('14:00', '16:00', 'pyqs')}>
            + Afternoon PYQs (2-4)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleAddPreset('19:00', '21:00', 'revision')}>
            + Evening Revision (7-9)
          </button>
        </div>

        <div className="flex items-center gap-1 bg-card p-1 rounded" style={{ border: '1px solid var(--border-primary)' }}>
          <button
            className={`btn btn-sm ${viewMode === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('timeline')}
          >
            📊 Timeline
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('cards')}
          >
            📋 Cards ({planned.length})
          </button>
        </div>
      </div>

      {/* SCHEDULE VIEW 1: Hour-by-Hour Visual Timeline */}
      {viewMode === 'timeline' && (
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          {planned.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>📅</div>
              <h3 className="text-base font-bold mb-1">No sessions planned for {isToday ? 'today' : date}</h3>
              <p className="text-secondary text-xs mb-3">Use the presets above or click "+ Add Study Block" to structure your day!</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
                + Plan a Study Block
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {/* Hour rows from 06:00 to 24:00 */}
              {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(hour => {
                const hourStr = `${String(hour).padStart(2, '0')}:00`;
                const nextHourStr = `${String(hour + 1).padStart(2, '0')}:00`;
                const hourMin = hour * 60;
                const nextHourMin = (hour + 1) * 60;

                // Find blocks that overlap with this hour
                const matchingBlocks = planned.filter(p => {
                  const s = timeToMinutes(p.start_time);
                  const e = timeToMinutes(p.end_time);
                  return (s < nextHourMin && e > hourMin);
                });

                const isCurrentHour = isToday && currentTime.getHours() === hour;

                return (
                  <div
                    key={hour}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 1fr',
                      gap: 'var(--space-3)',
                      alignItems: 'center',
                      minHeight: '44px',
                      borderTop: '1px solid var(--border-primary)',
                      paddingTop: '6px',
                      position: 'relative',
                    }}
                  >
                    {/* Hour Label */}
                    <div className="font-mono text-xs text-secondary font-bold flex items-center gap-1">
                      {isCurrentHour && <span className="text-accent animate-pulse">●</span>}
                      <span>{hourStr}</span>
                    </div>

                    {/* Block or Empty Slot */}
                    <div>
                      {matchingBlocks.length === 0 ? (
                        <div
                          style={{
                            height: '28px',
                            border: '1px dashed rgba(255,255,255,0.06)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {matchingBlocks.map(b => {
                            const bColor = getActivityColor(b.activity_type, b.subject_color);
                            return (
                              <div
                                key={b.id}
                                style={{
                                  flex: 1,
                                  minWidth: '220px',
                                  background: b.is_completed ? 'var(--bg-tertiary)' : `${bColor}18`,
                                  borderLeft: `4px solid ${bColor}`,
                                  borderTop: '1px solid var(--border-primary)',
                                  borderRight: '1px solid var(--border-primary)',
                                  borderBottom: '1px solid var(--border-primary)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: 'var(--space-2) var(--space-3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  opacity: b.is_completed ? 0.6 : 1,
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs" style={{ color: bColor }}>
                                      {b.start_time} - {b.end_time}
                                    </span>
                                    <span className="font-semibold text-xs text-primary truncate">
                                      {b.subject_name}
                                    </span>
                                    {b.is_completed && (
                                      <span className="tag text-xs" style={{ background: 'var(--success-subtle)', color: 'var(--success)', padding: '0 4px' }}>
                                        ✓ Done
                                      </span>
                                    )}
                                  </div>
                                  {b.topic_name && (
                                    <div className="text-xs text-secondary truncate mt-0.5">{b.topic_name}</div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 ml-2">
                                  {!b.is_completed && (
                                    <button
                                      className="btn btn-primary btn-sm"
                                      style={{ padding: '2px 8px', fontSize: '11px' }}
                                      onClick={() => handleLaunchInTimer(b)}
                                      title="Launch session in timer"
                                    >
                                      ▶ Start
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '2px 6px', fontSize: '12px' }}
                                    onClick={() => handleToggleComplete(b)}
                                    title={b.is_completed ? 'Mark incomplete' : 'Mark done'}
                                  >
                                    {b.is_completed ? '↩' : '✓'}
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm text-secondary"
                                    style={{ padding: '2px 6px', fontSize: '11px' }}
                                    onClick={() => handleDelete(b.id)}
                                    title="Delete block"
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SCHEDULE VIEW 2: Cards List */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {planned.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No sessions planned</div>
              <div className="empty-state-text">Plan your study blocks for {isToday ? 'today' : date}</div>
            </div>
          ) : (
            planned.map(p => {
              const bColor = getActivityColor(p.activity_type, p.subject_color);
              const durationMins = calculateDurationMinutes(p.start_time, p.end_time);

              return (
                <div
                  key={p.id}
                  className="card"
                  style={{
                    padding: 'var(--space-4)',
                    borderLeft: `4px solid ${bColor}`,
                    opacity: p.is_completed ? 0.65 : 1,
                    background: 'var(--bg-card)',
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm font-bold" style={{ color: bColor }}>
                          {p.start_time} – {p.end_time} ({formatHoursMins(durationMins)})
                        </span>
                        <span className="tag" style={{ background: `${bColor}20`, color: bColor }}>
                          {ACTIVITY_TYPES.find(a => a.value === p.activity_type)?.icon}{' '}
                          {p.activity_type.toUpperCase()}
                        </span>
                        {p.is_completed && (
                          <span className="tag" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                            ✓ Done
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-base">{p.subject_name}</div>
                      {p.topic_name && <div className="text-sm text-secondary">{p.topic_name}</div>}
                      {p.notes && <div className="text-xs text-secondary mt-1 italic">{p.notes}</div>}
                    </div>

                    <div className="flex items-center gap-2">
                      {!p.is_completed && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleLaunchInTimer(p)}>
                          ▶ Start in Timer
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => handleToggleComplete(p)}>
                        {p.is_completed ? 'Mark Incomplete' : '✓ Done'}
                      </button>
                      <button className="btn btn-ghost btn-sm text-secondary" onClick={() => handleDelete(p.id)}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Plan Study Block Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Plan Study Block</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select
                className="form-select"
                value={form.subject_id}
                onChange={e => handleFormSubjectChange(parseInt(e.target.value))}
              >
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Topic (optional)</label>
              <select
                className="form-select"
                value={form.topic_id}
                onChange={e => setForm(f => ({ ...f, topic_id: e.target.value }))}
              >
                <option value="">All / General Subject Study</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Activity Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {ACTIVITY_TYPES.map(a => (
                  <button
                    key={a.value}
                    type="button"
                    className={`btn ${form.activity_type === a.value ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setForm(f => ({ ...f, activity_type: a.value as ActivityType }))}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Block Focus / Notes (optional)</label>
              <textarea
                className="form-textarea"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Target goals for this session..."
              />
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Schedule Block</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
