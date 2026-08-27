import React, { useState, useEffect } from 'react';
import { CalendarEvent, ExamInfo } from '../types';
import { useToast } from '../contexts/ToastContext';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';

export default function Calendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const { addToast } = useToast();

  const [eventForm, setEventForm] = useState({
    name: '',
    event_date: formatLocalDate(new Date()),
    color: '#EF4444',
    event_type: 'exam' as any,
    description: '',
    is_exam: false,
  });

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    const [h, evts, exam] = await Promise.all([
      window.electronAPI.analytics.getHeatmap(year),
      window.electronAPI.events.getAll(),
      window.electronAPI.events.getExamInfo(),
    ]);
    setHeatmap(h);
    setEvents(evts);
    setExamInfo(exam);
  };

  const handleAddEvent = async () => {
    if (!eventForm.name.trim() || !eventForm.event_date) {
      addToast('Please enter event name and date', 'warning');
      return;
    }
    await window.electronAPI.events.create(eventForm);
    setShowAddEvent(false);
    setEventForm({
      name: '',
      event_date: formatLocalDate(new Date()),
      color: '#EF4444',
      event_type: 'exam',
      description: '',
      is_exam: false,
    });
    loadData();
    addToast('Calendar event created', 'success');
  };

  const handleDeleteEvent = async (id: number) => {
    await window.electronAPI.events.delete(id);
    loadData();
    addToast('Event deleted', 'info');
  };

  // Exam month and date detection
  const examDateObj = examInfo?.examDate ? parseLocalDate(examInfo.examDate) : null;
  const examYear = examDateObj ? examDateObj.getFullYear() : null;
  const examMonth = examDateObj ? examDateObj.getMonth() : null;
  const examDateStr = examInfo?.examDate || '';

  // Generate calendar days for the selected year
  const getCalendarDays = () => {
    const days: { date: string; hours: number; sessions: number; events: CalendarEvent[]; isExamDay: boolean }[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    const heatmapMap = new Map(heatmap.map(h => [h.date, h]));
    const eventsMap = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = eventsMap.get(e.event_date) || [];
      list.push(e);
      eventsMap.set(e.event_date, list);
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatLocalDate(d);
      const data = heatmapMap.get(dateStr);
      const dayEvents = eventsMap.get(dateStr) || [];
      const isExamDay = dateStr === examDateStr;

      days.push({
        date: dateStr,
        hours: data?.hours || 0,
        sessions: data?.sessions || 0,
        events: dayEvents,
        isExamDay,
      });
    }
    return days;
  };

  const days = getCalendarDays();
  const totalHours = heatmap.reduce((s, h) => s + h.hours, 0);
  const daysStudied = heatmap.filter(h => h.hours > 0).length;
  const maxHours = Math.max(...days.map(d => d.hours), 1);

  const getColor = (hours: number, isExamDay: boolean) => {
    if (isExamDay) return '#EF4444'; // Red highlight for exam day
    if (hours === 0) return 'var(--bg-tertiary)';
    const intensity = Math.min(hours / Math.max(maxHours, 8), 1);
    if (intensity < 0.25) return '#1a4731';
    if (intensity < 0.5) return '#166534';
    if (intensity < 0.75) return '#22c55e';
    return '#4ade80';
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Study Calendar</h1>
            <p className="page-subtitle">{Math.round(totalHours)}h total • {daysStudied} days studied in {year}</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddEvent(true)}>
              + Add Event
            </button>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setYear(y => y - 1)}>←</button>
              <span className="font-semibold">{year}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setYear(y => y + 1)}>→</button>
            </div>
          </div>
        </div>
      </div>

      {/* EXAM COUNTDOWN BANNER */}
      {examInfo && (
        <div
          className="card mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(59, 130, 246, 0.08))',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: 'var(--space-3) var(--space-4)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '1.25rem' }}>🎯</span>
              <div>
                <div className="font-bold text-sm" style={{ color: '#F87171' }}>
                  {examInfo.examName} • {new Date(examInfo.examDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="text-xs text-secondary">
                  Target GATE Exam Milestone
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 800,
                  color: '#F87171',
                }}
              >
                {examInfo.daysRemaining} DAYS
              </span>
              <span className="text-xs text-tertiary">remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* Month labels */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '4px', paddingLeft: '32px' }}>
        {months.map((m, i) => {
          const isExamMo = examYear === year && examMonth === i;
          return (
            <div
              key={m}
              style={{
                width: `${100 / 12}%`,
                fontSize: 'var(--text-xs)',
                fontWeight: isExamMo ? 700 : 400,
                color: isExamMo ? '#F87171' : 'var(--text-tertiary)',
              }}
            >
              {m} {isExamMo && '★'}
            </div>
          );
        })}
      </div>

      {/* Heatmap Grid */}
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {days.map(day => {
          const hasEvents = day.events.length > 0;
          return (
            <div
              key={day.date}
              className="heatmap-day"
              style={{
                background: getColor(day.hours, day.isExamDay),
                border: day.isExamDay ? '2px solid #FCA5A5' : hasEvents ? '1px solid #3B82F6' : undefined,
                position: 'relative',
                cursor: 'pointer',
              }}
              title={`${day.date}: ${day.hours.toFixed(1)}h, ${day.sessions} sessions${day.isExamDay ? ' [★ GATE EXAM]' : ''}${day.events.map(e => ` [${e.name}]`).join('')}`}
              onClick={() => setSelectedDay(day)}
            >
              {day.isExamDay && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-2px',
                    fontSize: '8px',
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  ★
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend & Events Key */}
      <div className="flex items-center justify-between flex-wrap gap-3 mt-4" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
        <div className="flex items-center gap-2">
          <span>Less</span>
          {[0, 2, 4, 6, 8].map(h => (
            <div key={h} style={{ width: '12px', height: '12px', borderRadius: '2px', background: getColor(h, false) }} />
          ))}
          <span>More</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#EF4444' }} />
            <span>GATE Exam</span>
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', border: '1px solid #3B82F6', background: 'var(--bg-tertiary)' }} />
            <span>Event / Milestone</span>
          </div>
        </div>
      </div>

      {/* Selected day inspect drawer */}
      {selectedDay && (
        <div className="card mt-4" style={{ maxWidth: '520px' }}>
          <div className="card-header">
            <div className="flex justify-between items-center w-full">
              <div className="card-title text-sm">
                {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              {selectedDay.isExamDay && (
                <span className="tag" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>
                  ★ GATE EXAM DAY
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <div className="text-xs text-tertiary">Study Time</div>
              <div className="font-bold text-accent">{selectedDay.hours.toFixed(1)}h</div>
            </div>
            <div>
              <div className="text-xs text-tertiary">Sessions</div>
              <div className="font-bold">{selectedDay.sessions}</div>
            </div>
          </div>

          {selectedDay.events.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-xs font-semibold text-secondary mb-2">Scheduled Events</div>
              {selectedDay.events.map((e: CalendarEvent) => (
                <div key={e.id} className="flex items-center justify-between text-xs py-1">
                  <span style={{ color: e.color, fontWeight: 600 }}>• {e.name}</span>
                  <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteEvent(e.id)}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly summary cards with EXAM MONTH Highlight */}
      <div className="section mt-6">
        <div className="section-title">Monthly Summary ({year})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
          {months.map((month, i) => {
            const isExamMo = examYear === year && examMonth === i;
            const monthDays = heatmap.filter(h => {
              const d = new Date(h.date);
              return d.getMonth() === i;
            });
            const monthHours = monthDays.reduce((s, d) => s + d.hours, 0);
            const monthActive = monthDays.filter(d => d.hours > 0).length;

            return (
              <div
                key={i}
                className="stat-card"
                style={{
                  position: 'relative',
                  border: isExamMo ? '1.5px solid rgba(239, 68, 68, 0.5)' : undefined,
                  background: isExamMo ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%)' : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="stat-label" style={{ color: isExamMo ? '#F87171' : undefined, fontWeight: isExamMo ? 700 : 500 }}>
                    {month}
                  </div>
                  {isExamMo && (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: '3px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#EF4444',
                      }}
                    >
                      EXAM MONTH
                    </span>
                  )}
                </div>
                <div className="stat-value">{Math.round(monthHours)}h</div>
                <div className="stat-sub">
                  {monthActive} days studied
                  {isExamMo && ` • Exam: ${new Date(examDateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="modal-overlay" onClick={() => setShowAddEvent(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Calendar Event</h2>
              <button className="modal-close" onClick={() => setShowAddEvent(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Full Length Mock 1, TOC Revision Deadline"
                value={eventForm.name}
                onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-input"
                value={eventForm.event_date}
                onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Event Type</label>
              <select
                className="form-select"
                value={eventForm.event_type}
                onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))}
              >
                <option value="exam">GATE Exam</option>
                <option value="mock_test">Mock Test</option>
                <option value="revision_deadline">Revision Deadline</option>
                <option value="phase_deadline">Phase Deadline</option>
                <option value="custom">Custom Milestone</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Details..."
                value={eventForm.description}
                onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventForm.is_exam}
                  onChange={e => setEventForm(f => ({ ...f, is_exam: e.target.checked }))}
                />
                <span>Set as primary GATE Exam Date</span>
              </label>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddEvent(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddEvent}>Save Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
