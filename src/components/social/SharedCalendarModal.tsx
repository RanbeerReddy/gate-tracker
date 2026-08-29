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
  const [year] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<SharedCalendarDay | null>(null);

  useEffect(() => {
    fetchSharedCalendar(user.id).then(data => {
      setCalendarDays(data);
      setLoading(false);
    });
  }, [user.id]);

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
  const totalHours = calendarDays.reduce((acc, d) => acc + (d.study_hours || 0), 0);
  const daysStudied = calendarDays.filter(d => (d.study_hours || 0) > 0).length;

  const getColor = (hours: number) => {
    if (hours === 0) return 'var(--bg-tertiary)';
    if (hours < 2) return '#1a4731';
    if (hours < 4) return '#166534';
    if (hours < 6) return '#22c55e';
    return '#4ade80';
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const firstDayOfWeek = new Date(year, 0, 1).getDay();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '840px' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Study Calendar • @{user.username}</h2>
            <p className="text-xs text-secondary mt-1">
              Sanitized daily consistency overview ({Math.round(totalHours)}h total • {daysStudied} days active)
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading shared calendar...
          </div>
        ) : (
          <div>
            <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
              {/* Month labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(53, 14px)', gap: '3px', marginBottom: '6px', paddingLeft: '28px', minWidth: '900px' }}>
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
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', minWidth: '900px' }}>
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
                        }}
                        title={`${day.date}: ${day.study_hours}h studied`}
                        onClick={() => setSelectedDay(day)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                <span>Less</span>
                {[0, 2, 4, 6, 8].map(h => (
                  <div key={h} style={{ width: '12px', height: '12px', borderRadius: '2px', background: getColor(h) }} />
                ))}
                <span>More</span>
              </div>
              <div className="text-xs text-tertiary">
                🔒 Private session notes & mistakes are not shared
              </div>
            </div>

            {/* Selected day inspect */}
            {selectedDay && (
              <div className="card mt-4" style={{ padding: 'var(--space-3)' }}>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold">
                    {parseLocalDate(selectedDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="font-bold text-accent">
                    {selectedDay.study_hours > 0 ? `${selectedDay.study_hours}h studied` : 'No study recorded'}
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
