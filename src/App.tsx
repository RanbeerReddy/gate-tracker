import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import { useTimer } from './contexts/TimerContext';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import TopicDetail from './pages/TopicDetail';
import Questions from './pages/Questions';
import Mistakes from './pages/Mistakes';
import Revision from './pages/Revision';
import PYQs from './pages/PYQs';
import Mocks from './pages/Mocks';
import Planner from './pages/Planner';
import Goals from './pages/Goals';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import SearchPage from './pages/Search';
import Settings from './pages/Settings';
import FirstRun from './pages/FirstRun';
import Community from './pages/Community';
import People from './pages/People';
import Profile from './pages/Profile';
import { createCommunityPost } from './services/supabase';

export default function App() {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [revisionDueCount, setRevisionDueCount] = useState(0);
  const { timer, formatTime, pauseSession, resumeSession, finishSession } = useTimer();
  const { syncProgress } = useAuth();
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishNotes, setFinishNotes] = useState('');
  const [finishQuestions, setFinishQuestions] = useState(0);
  const [finishCorrect, setFinishCorrect] = useState(0);
  const [finishYear, setFinishYear] = useState(String(new Date().getFullYear()));
  const [finishDifficulty, setFinishDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [finishRating, setFinishRating] = useState(3);
  const [finishConfidence, setFinishConfidence] = useState(70);
  const [shareWithCommunity, setShareWithCommunity] = useState(false);

  useEffect(() => {
    window.electronAPI.setup.isFirstRun().then(setIsFirstRun);
  }, []);

  const refreshDueCount = () => {
    window.electronAPI.revisions.getDue().then(due => {
      setRevisionDueCount(due?.length || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    refreshDueCount();
    const interval = setInterval(refreshDueCount, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isFirstRun === null) return null;

  if (isFirstRun) {
    return <FirstRun onComplete={() => setIsFirstRun(false)} />;
  }

  const handleOpenFinishModal = () => {
    // Reset modal states based on current activity
    setFinishQuestions(0);
    setFinishCorrect(0);
    setFinishNotes('');
    setFinishRating(3);
    setFinishConfidence(70);
    setFinishYear(String(new Date().getFullYear()));
    setFinishDifficulty('medium');
    setShowFinishModal(true);
  };

  const handleFinish = async () => {
    const elapsedMinutes = Math.round(timer.elapsed / 60);
    const subject = timer.subjectName;
    const isPYQ = timer.activityType === 'pyqs';
    const isRevision = timer.activityType === 'revision';

    const savedSession = await finishSession({
      notes: finishNotes,
      questions_solved: finishQuestions,
      focus_rating: finishRating || undefined,
    });

    // 1. If PYQs or questions were logged, automatically create question records
    if (finishQuestions > 0 && timer.subjectId) {
      const qYear = parseInt(finishYear) || new Date().getFullYear();
      const timePerQ = finishQuestions > 0 ? Math.round(timer.elapsed / finishQuestions) : null;
      const questionsToInsert: any[] = [];
      
      const safeCorrect = Math.min(finishCorrect, finishQuestions);
      const safeWrong = finishQuestions - safeCorrect;

      // Add correct questions
      for (let i = 0; i < safeCorrect; i++) {
        questionsToInsert.push({
          source: isPYQ ? `GATE ${qYear}` : 'Study Session',
          year: isPYQ ? qYear : null,
          subject_id: timer.subjectId,
          topic_id: timer.topicId || null,
          subtopic_id: timer.subtopicId || null,
          difficulty: finishDifficulty,
          question_type: 'mcq',
          is_correct: 1,
          time_seconds: timePerQ,
          confidence: finishRating >= 4 ? 'high' : 'medium',
          is_pyq: isPYQ ? 1 : 0,
          notes: finishNotes || null,
        });
      }

      // Add wrong questions
      for (let i = 0; i < safeWrong; i++) {
        questionsToInsert.push({
          source: isPYQ ? `GATE ${qYear}` : 'Study Session',
          year: isPYQ ? qYear : null,
          subject_id: timer.subjectId,
          topic_id: timer.topicId || null,
          subtopic_id: timer.subtopicId || null,
          difficulty: finishDifficulty,
          question_type: 'mcq',
          is_correct: 0,
          time_seconds: timePerQ,
          confidence: 'low',
          is_pyq: isPYQ ? 1 : 0,
          notes: finishNotes || null,
        });
      }

      if (questionsToInsert.length > 0) {
        window.electronAPI.questions.bulkCreate(questionsToInsert).catch(err => {
          console.warn('Auto question log error:', err);
        });
      }
    }

    // 2. If Revision session with a selected topic, automatically log the revision completion
    if (isRevision && timer.topicId) {
      window.electronAPI.revisions.create({
        topic_id: timer.topicId,
        subtopic_id: timer.subtopicId || null,
        performance_rating: finishRating,
        confidence: finishConfidence,
        notes: finishNotes || `Session revision: ${elapsedMinutes}m`,
      }).then(() => {
        refreshDueCount();
      }).catch(err => {
        console.warn('Auto revision log error:', err);
      });
    }

    // 3. Match today's planned sessions and mark matching block as completed
    if (savedSession?.id && timer.subjectId) {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const plannedToday = await window.electronAPI.planner.getByDate(todayStr);
        const match = plannedToday?.find((p: any) => 
          !p.is_completed && p.subject_id === timer.subjectId && 
          (!timer.topicId || !p.topic_id || p.topic_id === timer.topicId)
        );
        if (match) {
          await window.electronAPI.planner.markCompleted(match.id, savedSession.id);
        }
      } catch (err) {
        console.warn('Auto planner completion check error:', err);
      }
    }

    // 4. Dynamically sync updated study time & metrics to cloud
    syncProgress().catch(() => {});

    // 5. Optionally share safe summary to community if requested
    if (shareWithCommunity) {
      try {
        const activityLabel = isPYQ ? 'solving PYQs' : isRevision ? 'revision' : 'studying';
        const questionsSummary = finishQuestions > 0 ? ` Solved ${finishQuestions} questions (${finishCorrect} correct, ${Math.round(finishCorrect / finishQuestions * 100)}% accuracy).` : '';
        const summaryText = `Completed a ${elapsedMinutes}m session ${activityLabel} on ${subject || 'GATE preparation'}.${questionsSummary}`;
        await createCommunityPost(summaryText, subject || null, {
          subject_name: subject,
          hours_studied: Math.round((timer.elapsed / 3600) * 10) / 10,
          questions_solved: finishQuestions || 0,
          activity_type: timer.activityType,
        });
      } catch (err) {
        console.warn('Could not post session summary to community:', err);
      }
    }

    setShowFinishModal(false);
    setFinishNotes('');
    setFinishQuestions(0);
    setFinishCorrect(0);
    setFinishRating(3);
    setShareWithCommunity(false);
  };

  return (
    <div className="app-layout">
      <Sidebar revisionDueCount={revisionDueCount} />
      <main className="main-content" style={{ paddingBottom: timer.isRunning ? '60px' : '0' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/study" element={<Study />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/subjects/:id" element={<SubjectDetail />} />
          <Route path="/topics/:id" element={<TopicDetail />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/mistakes" element={<Mistakes />} />
          <Route path="/revision" element={<Revision />} />
          <Route path="/pyqs" element={<PYQs />} />
          <Route path="/mocks" element={<Mocks />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/community" element={<Community />} />
          <Route path="/people" element={<People />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {/* Floating Timer Bar */}
      {timer.isRunning && (
        <div className="timer-bar">
          <div className="timer-display-sm" style={{
            color: timer.isPaused ? 'var(--warning)' : 'var(--accent)',
          }}>
            {formatTime(timer.elapsed)}
          </div>
          <div className="timer-bar-info">
            <span style={{ fontWeight: 600 }}>{timer.subjectName}</span>
            {timer.topicName && <span> → {timer.topicName}</span>}
            <span style={{ marginLeft: '8px', opacity: 0.7 }}>
              {timer.activityType.replace('_', ' ')}
            </span>
          </div>
          <div className="timer-bar-actions">
            {timer.isPaused ? (
              <button className="btn btn-success btn-sm" onClick={resumeSession}>▶ Resume</button>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={pauseSession}>⏸ Pause</button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setShowFinishModal(true)}>
              ⏹ Finish
            </button>
          </div>
        </div>
      )}

      {/* Finish Session Modal */}
      {showFinishModal && (
        <div className="modal-overlay" onClick={() => setShowFinishModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Session Complete 🎉</h2>
              <button className="modal-close" onClick={() => setShowFinishModal(false)}>✕</button>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)', background: 'var(--bg-tertiary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)' }}>
              <div className="timer-display" style={{ fontSize: '2.25rem', color: 'var(--accent)' }}>
                {formatTime(timer.elapsed)}
              </div>
              <div className="font-medium mt-1">
                {timer.subjectName} {timer.topicName ? `→ ${timer.topicName}` : ''}
              </div>
              <span className="tag mt-2" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                {timer.activityType.toUpperCase()}
              </span>
            </div>

            {/* PYQ / Practice Questions Section */}
            {(timer.activityType === 'pyqs' || timer.activityType === 'practice') && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span>📝</span>
                  <span>{timer.activityType === 'pyqs' ? 'PYQ Performance Tracking' : 'Questions Log'}</span>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label text-xs">Questions Attempted</label>
                    <input
                      type="number"
                      className="form-input"
                      value={finishQuestions || ''}
                      onChange={e => {
                        const total = Math.max(0, parseInt(e.target.value) || 0);
                        setFinishQuestions(total);
                        if (finishCorrect > total) setFinishCorrect(total);
                      }}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label text-xs text-success">✓ Correct</label>
                    <input
                      type="number"
                      className="form-input"
                      value={finishCorrect || ''}
                      onChange={e => {
                        const correct = Math.max(0, parseInt(e.target.value) || 0);
                        setFinishCorrect(Math.min(correct, finishQuestions || correct));
                        if (!finishQuestions || finishQuestions < correct) {
                          setFinishQuestions(correct);
                        }
                      }}
                      min="0"
                      max={finishQuestions || 999}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group" style={{ width: '80px' }}>
                    <label className="form-label text-xs text-danger">✗ Wrong</label>
                    <div className="form-input" style={{ background: 'var(--bg-tertiary)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {Math.max(0, finishQuestions - finishCorrect)}
                    </div>
                  </div>
                </div>

                {finishQuestions > 0 && (
                  <div className="flex items-center justify-between text-xs mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>
                    <span>Calculated Accuracy:</span>
                    <span className="font-bold font-mono" style={{ color: (finishCorrect / finishQuestions) >= 0.75 ? 'var(--success)' : (finishCorrect / finishQuestions) >= 0.5 ? 'var(--warning)' : 'var(--danger)' }}>
                      {Math.round((finishCorrect / finishQuestions) * 100)}%
                    </span>
                  </div>
                )}

                {timer.activityType === 'pyqs' && (
                  <div className="form-row mt-2">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label text-xs">GATE Year</label>
                      <select className="form-select text-xs" value={finishYear} onChange={e => setFinishYear(e.target.value)}>
                        {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map(y => (
                          <option key={y} value={y}>GATE {y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label text-xs">Difficulty</label>
                      <select className="form-select text-xs" value={finishDifficulty} onChange={e => setFinishDifficulty(e.target.value as any)}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Standard questions input for other activity types */}
            {timer.activityType !== 'pyqs' && timer.activityType !== 'practice' && (
              <div className="form-group">
                <label className="form-label">Questions Solved (optional)</label>
                <input
                  type="number"
                  className="form-input"
                  value={finishQuestions || ''}
                  onChange={e => setFinishQuestions(parseInt(e.target.value) || 0)}
                  min="0"
                  placeholder="0"
                />
              </div>
            )}

            {/* Revision Quality / Retention Section */}
            {timer.activityType === 'revision' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span>🔄</span>
                  <span>Revision Assessment</span>
                </div>
                <div className="form-group mb-2">
                  <label className="form-label text-xs">Topic Retention / Performance (1-5 ⭐)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        className={`btn ${finishRating === n ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => {
                          setFinishRating(n);
                          setFinishConfidence(n * 20);
                        }}
                      >
                        {n} ⭐
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group mb-1">
                  <label className="form-label text-xs">Confidence: {finishConfidence}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={finishConfidence}
                    onChange={e => setFinishConfidence(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Focus Quality */}
            {timer.activityType !== 'revision' && (
              <div className="form-group">
                <label className="form-label">Focus Quality (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className={`btn ${finishRating === n ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => setFinishRating(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                value={finishNotes}
                onChange={e => setFinishNotes(e.target.value)}
                placeholder="Key takeaways, formulas reviewed, mistakes to revisit..."
              />
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareWithCommunity}
                  onChange={e => setShareWithCommunity(e.target.checked)}
                />
                <span>Share safe session summary to Community feed</span>
              </label>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowFinishModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFinish}>Save & Record Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
