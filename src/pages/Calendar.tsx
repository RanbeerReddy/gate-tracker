import React, { useState, useEffect } from 'react';

export default function Calendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<any>(null);

  useEffect(() => { loadData(); }, [year]);

  const loadData = async () => {
    const data = await window.electronAPI.analytics.getHeatmap(year);
    setHeatmap(data);
  };

  // Generate calendar days
  const getCalendarDays = () => {
    const days: { date: string; hours: number; sessions: number }[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    
    const heatmapMap = new Map(heatmap.map(h => [h.date, h]));
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const data = heatmapMap.get(dateStr);
      days.push({
        date: dateStr,
        hours: data?.hours || 0,
        sessions: data?.sessions || 0,
      });
    }
    return days;
  };

  const days = getCalendarDays();
  const totalHours = heatmap.reduce((s, h) => s + h.hours, 0);
  const daysStudied = heatmap.filter(h => h.hours > 0).length;
  const maxHours = Math.max(...days.map(d => d.hours), 1);

  const getColor = (hours: number) => {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Study Calendar</h1>
            <p className="page-subtitle">{Math.round(totalHours)}h total • {daysStudied} days studied</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setYear(y => y - 1)}>←</button>
            <span className="font-semibold">{year}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setYear(y => y + 1)}>→</button>
          </div>
        </div>
      </div>

      {/* Month labels */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '4px', paddingLeft: '32px' }}>
        {months.map((m, i) => (
          <div key={m} style={{ width: `${100 / 12}%`, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {m}
          </div>
        ))}
      </div>

      {/* Heatmap grid - by week */}
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {days.map(day => (
          <div
            key={day.date}
            className="heatmap-day"
            style={{ background: getColor(day.hours) }}
            title={`${day.date}: ${day.hours.toFixed(1)}h, ${day.sessions} sessions`}
            onClick={() => setSelectedDay(day)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
        <span>Less</span>
        {[0, 2, 4, 6, 8].map(h => (
          <div key={h} style={{ width: '14px', height: '14px', borderRadius: '2px', background: getColor(h) }} />
        ))}
        <span>More</span>
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <div className="card mt-4" style={{ maxWidth: '400px' }}>
          <div className="card-header">
            <div className="card-title">{new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <div className="text-xs text-tertiary">Study Time</div>
              <div className="font-bold">{selectedDay.hours.toFixed(1)}h</div>
            </div>
            <div>
              <div className="text-xs text-tertiary">Sessions</div>
              <div className="font-bold">{selectedDay.sessions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly summary */}
      <div className="section mt-6">
        <div className="section-title">Monthly Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
          {months.map((month, i) => {
            const monthDays = heatmap.filter(h => {
              const d = new Date(h.date);
              return d.getMonth() === i;
            });
            const monthHours = monthDays.reduce((s, d) => s + d.hours, 0);
            const monthActive = monthDays.filter(d => d.hours > 0).length;
            return (
              <div key={i} className="stat-card">
                <div className="stat-label">{month}</div>
                <div className="stat-value">{Math.round(monthHours)}h</div>
                <div className="stat-sub">{monthActive} days</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
