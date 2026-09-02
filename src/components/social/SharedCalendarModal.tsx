import React, { useState, useEffect } from 'react';
import { fetchSharedCalendar } from '../../services/supabase';
import { SharedCalendarDay, UserProfile } from '../../types';
import { formatLocalDate, parseLocalDate } from '../../utils/dateUtils';

interface Props {
  user: UserProfile;
  onClose: () => void;
}

export default function SharedCalendarModal({ user, onClose }: Props) {
  const [calendarDays, setCalendarDays] = useState<SharedCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<SharedCalendarDay | null>(null);

  useEffect(() => {
    loadCalendar();
  }, [user.id]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const data = await fetchSharedCalendar(user.id);
      setCalendarDays(data || []);
    } catch (err) {
      console.warn('Error loading shared calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get calendar days for the active year
  const getCalendarDays = () => {
    const days: (SharedCalendarDay | null)[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const map = new Map(calendarDays.map(d => [d.date, d]));

    const firstDayOfWeek = start.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatLocalDate(d);
      const data = map.get(dateStr);
      days.push({
        user_id: user.id,
        date: dateStr,
        study_hours: data?.study_hours || 0,
        studied: (data?.study_hours || 0) > 0,
      });
    }
    return days;
  };

  const days = getCalendarDays();
  
  // Year-specific stats
  const yearDays = calendarDays.filter(d => d.date.startsWith(String(year)));
  const yearHours = Math.round(yearDays.reduce((acc, d) => acc + (d.study_hours || 0), 0) * 10) / 10;
  const yearActiveDays = yearDays.filter(d => (d.study_hours || 0) > 0).length;

  // Lifetime total stats
  const lifetimeHours = Math.round(calendarDays.reduce((acc, d) => acc + (d.study_hours || 0), 0) * 10) / 10;
  const lifetimeDaysStudied = calendarDays.filter(d => (d.study_hours || 0) > 0).length;

  const getColor = (hours: number) => {
    if (hours === 0) return 'var(--bg-tertiary)';
    if (hours < 2) return '#1a4731';
    if (hours < 4) return '#166534';
    if (hours < 6) return '#22c55e';
    return '#4ade80';
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const firstDayOfWeek = new Date(year, 0, 1).getDay();

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '860px' }}>
        <div className="modal-header">
          <div className="flex items-center justify-between w-full pr-4 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="modal-title">Study Calendar • @{user.username}</h2>
                <span
                  className="tag"
                  style={{
                    fontSize: '11px',
                    background: user.gate_paper === 'EC' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: user.gate_paper === 'EC' ? '#10B981' : '#3B82F6',
                    fontWeight: 700,
                  }}
                >
                  GATE {user.gate_paper || 'CS'}
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">
                {yearHours}h studied in {year} ({yearActiveDays} active days) • {lifetimeHours}h lifetime total
              </p>
            </div>

            {/* Year Selector / Slider */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-tertiary p-1 rounded" style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 8px' }}
                  onClick={() => setYear(y => y - 1)}
                  title="Previous Year"
                >
                  ←
                </button>

                {availableYears.map(y => (
                  <button
                    key={y}
                    className={`btn btn-sm ${year === y ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '2px 8px', fontSize: '11px', fontWeight: year === y ? 700 : 500 }}
                    onClick={() => setYear(y)}
                  >
                    {y}
                  </button>
                ))}

                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 8px' }}
                  onClick={() => setYear(y => y + 1)}
                  title="Next Year"
                >
                  →
                </button>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading @{user.username}'s study heatmap...
          </div>
        ) : (
          <div>
            <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
              {/* Month labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(53, 14px)', gap: '3px', marginBottom: '6px', paddingLeft: '28px', minWidth: '920px' }}>
                {months.map((m, i) => {
                  const firstOfMonth = new Date(year, i, 1);
                  const dayOfYear = Math.floor((firstOfMonth.getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
                  const weekCol = Math.floor((firstDayOfWeek + dayOfYear) / 7) + 1;
                  return (
                    <div key={m} style={{ gridColumn: weekCol, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {m}
                    </div>
                  );
                })}
              </div>

              {/* Heatmap Grid with Weekday Labels */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', minWidth: '920px' }}>
                <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 14px)', gap: '3px', fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: '14px', textAlign: 'right', width: '22px' }}>
                  <span></span>
                  <span>Mon</span>
                  <span></span>
                  <span>Wed</span>
                  <span></span>
                  <span>Fri</span>
                  <span></span>
                </div>
                <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 14px)', gridAutoFlow: 'column', gap: '3px' }}>
                  {days.map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} style={{ width: '14px', height: '14px' }} />;
                    }
                    return (
                      <div
                        key={day.date}
                        className="heatmap-day"
                        style={{
                          background: getColor(day.study_hours),
                          cursor: 'pointer',
                          borderRadius: '2px',
                        }}
                        title={`${day.date}: ${day.study_hours}h studied`}
                        onClick={() => setSelectedDay(day)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legend & Privacy Note */}
            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
              <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                <span>Less</span>
                {[0, 2, 4, 6, 8].map(h => (
                  <div key={h} style={{ width: '12px', height: '12px', borderRadius: '2px', background: getColor(h) }} />
                ))}
                <span>More</span>
              </div>
              <div className="text-xs text-tertiary">
                🔒 Private session notes, mistake text & question content are not shared
              </div>
            </div>

            {/* Selected day inspect card */}
            {selectedDay && (
              <div className="card mt-4" style={{ padding: 'var(--space-3)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold">
                    {parseLocalDate(selectedDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="font-bold text-accent">
                    {selectedDay.study_hours > 0 ? `⚡ ${selectedDay.study_hours}h studied` : 'No study logged'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
