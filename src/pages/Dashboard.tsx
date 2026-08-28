import React, { useState, useEffect } from 'react';
import { DashboardData, Recommendation, ExamInfo, CommunityPost } from '../types';
import { fetchCommunityPosts } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

function formatHours(seconds: number): string {
  const h = seconds / 3600;
  return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [recentCommunity, setRecentCommunity] = useState<CommunityPost[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [dashboard, recs, allSettings, exam] = await Promise.all([
      window.electronAPI.analytics.getDashboard(),
      window.electronAPI.analytics.getRecommendations(),
      window.electronAPI.settings.getAll(),
      window.electronAPI.events.getExamInfo(),
    ]);
    setData(dashboard);
    setRecommendations(recs);
    setSettings(allSettings);
    setExamInfo(exam);

    fetchCommunityPosts(0, 3, 'latest').then(posts => {
      setRecentCommunity(posts);
    }).catch(() => {});
  };

  if (!data) return <div className="page"><div className="text-secondary">Loading...</div></div>;

  const dailyTarget = parseFloat(settings.daily_study_target_hours || '7') * 3600;
  const dailyProgress = dailyTarget > 0 ? Math.min(100, (data.today.studySeconds / dailyTarget) * 100) : 0;

  const activePaper = data.activePaper || settings.gate_paper || 'CS';
  const isEC = activePaper === 'EC';

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">Dashboard</h1>
              <span
                className="tag"
                style={{
                  background: isEC ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: isEC ? '#10B981' : '#3B82F6',
                  border: isEC ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {isEC ? 'GATE EC — Electronics & Communication' : 'GATE CS — Computer Science & IT'}
              </span>
            </div>
            <p className="page-subtitle">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {settings.target_gate_year && ` • Target: GATE ${activePaper} ${settings.target_gate_year}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Exam Countdown Pill */}
            {examInfo && (
              <div
                className="card flex items-center gap-2 cursor-pointer"
                style={{
                  padding: '6px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
                onClick={() => navigate('/calendar')}
                title="View on Calendar"
              >
                <span>🎯</span>
                <span className="font-semibold text-xs text-primary">{examInfo.examName}</span>
                <span className="text-xs font-bold" style={{ color: '#EF4444' }}>
                  {examInfo.daysRemaining}d remaining
                </span>
              </div>
            )}

            <button className="btn btn-primary btn-lg" onClick={() => navigate('/study')}>
              ⏱️ Start Study
            </button>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="section">
        <div className="section-title">Today</div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Study Time</div>
            <div className="stat-value">{formatHours(data.today.studySeconds)}</div>
            <div style={{ marginTop: 'var(--space-2)' }}>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{
                  width: `${dailyProgress}%`,
                  background: dailyProgress >= 100 ? 'var(--success)' : 'var(--accent)',
                }} />
              </div>
              <div className="stat-sub">{Math.round(dailyProgress)}% of {settings.daily_study_target_hours || 7}h goal</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sessions</div>
            <div className="stat-value">{data.today.sessions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Questions</div>
            <div className="stat-value">{data.today.questionsSolved}</div>
            <div className="stat-sub">
              {data.today.questionsCorrect} correct
              {data.today.questionsSolved > 0 && ` • ${data.today.accuracy}%`}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Subjects Today</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
              {data.today.subjects.length === 0 ? (
                <span className="text-tertiary text-sm">None yet</span>
              ) : (
                data.today.subjects.map((s, i) => (
                  <span key={i} className="tag" style={{ background: `${s.color}20`, color: s.color }}>
                    <span className="tag-dot" style={{ background: s.color }} />
                    {s.name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="section-grid section-grid-2">
        {/* This Week */}
        <div className="section">
          <div className="section-title">This Week</div>
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <div className="text-tertiary text-xs font-medium">Total Study</div>
                <div className="font-bold" style={{ fontSize: 'var(--text-xl)' }}>{formatHours(data.week.studySeconds)}</div>
              </div>
              <div>
                <div className="text-tertiary text-xs font-medium">Avg Daily</div>
                <div className="font-bold" style={{ fontSize: 'var(--text-xl)' }}>{formatHours(data.week.avgDailySeconds)}</div>
              </div>
              <div>
                <div className="text-tertiary text-xs font-medium">Days Active</div>
                <div className="font-bold" style={{ fontSize: 'var(--text-xl)' }}>{data.week.daysStudied}/7</div>
              </div>
              <div>
                <div className="text-tertiary text-xs font-medium">Questions</div>
                <div className="font-bold" style={{ fontSize: 'var(--text-xl)' }}>
                  {data.week.questionsSolved}
                  {data.week.questionsSolved > 0 && (
                    <span className="text-sm text-secondary" style={{ fontWeight: 400, marginLeft: '4px' }}>
                      ({data.week.accuracy}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Syllabus Progress */}
        <div className="section">
          <div className="section-title">Syllabus Progress</div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
              <div>
                <div className="font-bold" style={{ fontSize: 'var(--text-2xl)' }}>
                  {data.syllabus.total_topics > 0
                    ? Math.round(((data.syllabus.completed) / data.syllabus.total_topics) * 100)
                    : 0}%
                </div>
                <div className="text-tertiary text-xs">Complete</div>
              </div>
              <div className="flex-1">
                <div className="progress-bar progress-bar-lg">
                  <div className="progress-bar-fill" style={{
                    width: `${data.syllabus.total_topics > 0 ? (data.syllabus.completed / data.syllabus.total_topics) * 100 : 0}%`,
                    background: 'var(--success)',
                  }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <span>✅ {data.syllabus.completed} done</span>
              <span>📖 {data.syllabus.learning} learning</span>
              <span>🔄 {data.syllabus.needs_revision} revision</span>
              <span>⬜ {data.syllabus.not_started} pending</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section-grid section-grid-2">
        {/* Recommendations */}
        <div className="section">
          <div className="section-title">Recommended Next</div>
          <div className="card" style={{ padding: 0 }}>
            {recommendations.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <div className="text-sm text-tertiary">Start studying to get personalized recommendations</div>
              </div>
            ) : (
              <div>
                {recommendations.slice(0, 5).map((rec, i) => (
                  <div key={i} style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: i < recommendations.length - 1 ? '1px solid var(--border-primary)' : 'none',
                    cursor: 'pointer',
                  }}
                    onClick={() => rec.topic_id && navigate(`/topics/${rec.topic_id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 'var(--text-sm)' }}>
                        {rec.type === 'revision' ? '🔄' : rec.type === 'practice' ? '✏️' : '📖'}
                      </span>
                      <span className="text-sm font-medium">{rec.title}</span>
                      {rec.priority === 'high' && (
                        <span className="tag" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', fontSize: '10px' }}>
                          High
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-tertiary" style={{ marginTop: '2px', marginLeft: '24px' }}>
                      {rec.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Info & Community Snippet */}
        <div className="section">
          <div className="section-title">Status & Community</div>
          <div className="card" style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Revision Due</span>
              <span className="text-sm font-semibold" style={{
                color: data.revisionDueCount > 0 ? 'var(--warning)' : 'var(--success)',
              }}>
                {data.revisionDueCount} topics
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Recent Mock Score</span>
              <span className="text-sm font-semibold">
                {data.recentMocks.length > 0
                  ? `${data.recentMocks[0].score}/${data.recentMocks[0].total_marks}`
                  : 'No tests yet'}
              </span>
            </div>

            {/* Community mini-feed */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-secondary">💬 Recent from Community</span>
                <button className="btn btn-ghost btn-sm text-accent" onClick={() => navigate('/community')} style={{ padding: '0 4px', fontSize: '11px' }}>
                  View All →
                </button>
              </div>

              {recentCommunity.length === 0 ? (
                <div className="text-xs text-tertiary">
                  Join the conversation on the Community page to share progress with fellow aspirants.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '6px' }}>
                  {recentCommunity.map(p => (
                    <div
                      key={p.id}
                      className="text-xs p-2 rounded cursor-pointer"
                      style={{ background: 'var(--bg-tertiary)' }}
                      onClick={() => navigate('/community')}
                    >
                      <div className="font-semibold text-primary mb-1">
                        @{p.author?.username || 'aspirant'}
                        {p.subject_tag && <span className="text-accent ml-2">[{p.subject_tag}]</span>}
                      </div>
                      <div className="truncate text-secondary">{p.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subject Progress */}
      <div className="section">
        <div className="section-title">Subject Progress</div>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {data.subjectCompletion.map((s: any) => (
            <div key={s.id}
              className="flex items-center gap-3 cursor-pointer"
              style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)' }}
              onClick={() => navigate(`/subjects/${s.id}`)}
            >
              <span className="color-dot" style={{ background: s.color }} />
              <span className="text-sm font-medium" style={{ width: '200px', flexShrink: 0 }}>{s.name}</span>
              <div className="progress-bar flex-1">
                <div className="progress-bar-fill" style={{
                  width: `${s.total_topics > 0 ? (s.completed_topics / s.total_topics) * 100 : 0}%`,
                  background: s.color,
                }} />
              </div>
              <span className="text-xs text-tertiary" style={{ width: '60px', textAlign: 'right' }}>
                {s.total_topics > 0 ? Math.round((s.completed_topics / s.total_topics) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
