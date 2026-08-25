import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function Analytics() {
  const [tab, setTab] = useState<'study' | 'questions' | 'weak'>('study');
  const [days, setDays] = useState(30);
  const [studyData, setStudyData] = useState<any>(null);
  const [questionData, setQuestionData] = useState<any>(null);
  const [weakAreas, setWeakAreas] = useState<any[]>([]);

  useEffect(() => { loadData(); }, [days]);

  const loadData = async () => {
    const [study, questions, weak] = await Promise.all([
      window.electronAPI.analytics.getStudyAnalytics({ days }),
      window.electronAPI.analytics.getQuestionAnalytics({ days }),
      window.electronAPI.analytics.getWeakAreas(),
    ]);
    setStudyData(study);
    setQuestionData(questions);
    setWeakAreas(weak);
  };

  const CHART_COLORS = ['#4f7df5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#14b8a6', '#a855f7', '#e11d48', '#d946ef'];

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Analytics</h1>
          <div className="flex gap-2">
            {[7, 14, 30, 90].map(d => (
              <button key={d} className={`btn ${days === d ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setDays(d)}>{d}d</button>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'study' ? 'active' : ''}`} onClick={() => setTab('study')}>Study</button>
        <button className={`tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>Questions</button>
        <button className={`tab ${tab === 'weak' ? 'active' : ''}`} onClick={() => setTab('weak')}>Weak Areas</button>
      </div>

      {tab === 'study' && studyData && (
        <>
          <div className="stats-grid mb-4">
            <div className="stat-card">
              <div className="stat-label">Total Hours</div>
              <div className="stat-value">{Math.round(studyData.totals?.total_hours || 0)}h</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Sessions</div>
              <div className="stat-value">{studyData.totals?.total_sessions || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Days Active</div>
              <div className="stat-value">{studyData.totals?.days_studied || 0}/{days}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Session</div>
              <div className="stat-value">{Math.round(studyData.avgSessionMinutes || 0)}m</div>
            </div>
          </div>

          {/* Daily study chart */}
          <div className="card mb-4">
            <div className="card-title mb-4">Daily Study Hours</div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={studyData.dailyStudy}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '13px' }} />
                <Bar dataKey="hours" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Study by subject */}
          {studyData.bySubject?.length > 0 && (
            <div className="section-grid section-grid-2">
              <div className="card">
                <div className="card-title mb-4">By Subject</div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={studyData.bySubject} dataKey="hours" nameKey="name" cx="50%" cy="50%"
                      outerRadius={90} label={({ name, hours }: any) => `${name}: ${hours.toFixed(1)}h`}
                      labelLine={{ stroke: 'var(--text-tertiary)' }}>
                      {studyData.bySubject.map((_: any, i: number) => (
                        <Cell key={i} fill={studyData.bySubject[i].color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '6px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div className="card-title mb-4">By Activity</div>
                {studyData.byActivity?.map((a: any) => (
                  <div key={a.activity_type} className="flex items-center gap-3 mb-2">
                    <span className="text-sm" style={{ width: '120px' }}>{a.activity_type.replace('_', ' ')}</span>
                    <div className="progress-bar flex-1">
                      <div className="progress-bar-fill" style={{
                        width: `${(a.hours / (studyData.totals?.total_hours || 1)) * 100}%`,
                        background: 'var(--accent)',
                      }} />
                    </div>
                    <span className="text-sm font-mono" style={{ width: '50px', textAlign: 'right' }}>{a.hours.toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'questions' && questionData && (
        <>
          {/* Daily accuracy chart */}
          {questionData.dailyQuestions?.length > 0 && (
            <div className="card mb-4">
              <div className="card-title mb-4">Daily Questions & Accuracy</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={questionData.dailyQuestions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                    tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '6px' }} />
                  <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} dot={false} name="Questions" />
                  <Line type="monotone" dataKey="accuracy" stroke="var(--success)" strokeWidth={2} dot={false} name="Accuracy %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By subject accuracy */}
          {questionData.bySubject?.length > 0 && (
            <div className="card mb-4">
              <div className="card-title mb-4">Accuracy by Subject</div>
              {questionData.bySubject.map((s: any) => (
                <div key={s.name} className="flex items-center gap-3 mb-2">
                  <span className="color-dot" style={{ background: s.color }} />
                  <span className="text-sm" style={{ width: '180px' }}>{s.name}</span>
                  <div className="progress-bar flex-1">
                    <div className="progress-bar-fill" style={{
                      width: `${s.accuracy || 0}%`,
                      background: (s.accuracy || 0) >= 70 ? 'var(--success)' : (s.accuracy || 0) >= 50 ? 'var(--warning)' : 'var(--danger)',
                    }} />
                  </div>
                  <span className="text-sm font-medium" style={{ width: '50px', textAlign: 'right' }}>{s.accuracy || 0}%</span>
                  <span className="text-xs text-tertiary" style={{ width: '50px', textAlign: 'right' }}>{s.total} Qs</span>
                </div>
              ))}
            </div>
          )}

          {/* Mistake categories */}
          {questionData.mistakeCategories?.length > 0 && (
            <div className="card">
              <div className="card-title mb-4">Mistake Categories</div>
              {questionData.mistakeCategories.map((c: any, i: number) => (
                <div key={c.category} className="flex items-center gap-3 mb-2">
                  <span className="text-sm" style={{ width: '180px' }}>{c.category.replace('_', ' ')}</span>
                  <div className="progress-bar flex-1">
                    <div className="progress-bar-fill" style={{
                      width: `${(c.count / (questionData.mistakeCategories[0]?.count || 1)) * 100}%`,
                      background: CHART_COLORS[i % CHART_COLORS.length],
                    }} />
                  </div>
                  <span className="text-sm font-mono">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'weak' && (
        weakAreas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💪</div>
            <div className="empty-state-title">No weak areas detected</div>
            <div className="empty-state-text">Solve more questions to identify areas for improvement</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {weakAreas.map((w: any, i: number) => (
              <div key={w.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>#{i + 1}</span>
                      <span className="color-dot" style={{ background: w.color }} />
                      <span className="text-sm text-secondary">{w.subject_name}</span>
                    </div>
                    <div className="font-semibold">{w.topic_name}</div>
                    <div className="flex gap-4 mt-1 text-xs text-tertiary">
                      <span>Accuracy: <strong className="text-danger">{w.accuracy || 0}%</strong></span>
                      <span>{w.total_questions} questions</span>
                      {w.unresolved_mistakes > 0 && <span>{w.unresolved_mistakes} unresolved mistakes</span>}
                      {w.last_studied && <span>Last studied: {new Date(w.last_studied).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-danger" style={{ fontSize: 'var(--text-xl)' }}>
                      {w.accuracy || 0}%
                    </div>
                    <div className="text-xs text-tertiary">accuracy</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
