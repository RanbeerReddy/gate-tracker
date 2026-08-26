import React, { useState, useEffect } from 'react';
import { fetchSharedCalendar } from '../../services/supabase';
import { SharedCalendarDay, UserProfile } from '../../types';

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
    const days: SharedCalendarDay[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const map = new Map(calendarDays.map(d => [d.date, d]));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px' }}>
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
            {/* Month labels */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '4px', paddingLeft: '32px' }}>
              {months.map(m => (
                <div key={m} style={{ width: `${100 / 12}%`, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {m}
                </div>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
              {days.map(day => (
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
              ))}
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
                    {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
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
