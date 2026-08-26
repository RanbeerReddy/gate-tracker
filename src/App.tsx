import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import { useTimer } from './contexts/TimerContext';
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
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishNotes, setFinishNotes] = useState('');
  const [finishQuestions, setFinishQuestions] = useState(0);
  const [finishRating, setFinishRating] = useState(0);
  const [shareWithCommunity, setShareWithCommunity] = useState(false);

  useEffect(() => {
    window.electronAPI.setup.isFirstRun().then(setIsFirstRun);
  }, []);

  useEffect(() => {
    window.electronAPI.revisions.getDue().then(due => {
      setRevisionDueCount(due?.length || 0);
    }).catch(() => {});
    
    const interval = setInterval(() => {
      window.electronAPI.revisions.getDue().then(due => {
        setRevisionDueCount(due?.length || 0);
      }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isFirstRun === null) return null;

  if (isFirstRun) {
    return <FirstRun onComplete={() => setIsFirstRun(false)} />;
  }

  const handleFinish = async () => {
    const elapsedMinutes = Math.round(timer.elapsed / 60);
    const subject = timer.subjectName;

    await finishSession({
      notes: finishNotes,
      questions_solved: finishQuestions,
      focus_rating: finishRating || undefined,
    });

    // Optionally share safe summary to community if requested
    if (shareWithCommunity) {
      try {
        const summaryText = `Completed a ${elapsedMinutes}m study session on ${subject || 'GATE preparation'}.${finishQuestions > 0 ? ` Solved ${finishQuestions} practice questions.` : ''}`;
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
    setFinishRating(0);
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Session Complete</h2>
              <button className="modal-close" onClick={() => setShowFinishModal(false)}>✕</button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
              <div className="timer-display" style={{ fontSize: '2.5rem' }}>
                {formatTime(timer.elapsed)}
              </div>
              <div className="text-secondary mt-2">
                {timer.subjectName} {timer.topicName ? `→ ${timer.topicName}` : ''}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Questions Solved</label>
              <input
                type="number"
                className="form-input"
                value={finishQuestions || ''}
                onChange={e => setFinishQuestions(parseInt(e.target.value) || 0)}
                min="0"
                placeholder="0"
              />
            </div>
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
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                value={finishNotes}
                onChange={e => setFinishNotes(e.target.value)}
                placeholder="What did you cover?"
              />
            </div>
            <div className="form-group">
              <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareWithCommunity}
                  onChange={e => setShareWithCommunity(e.target.checked)}
                />
                <span>Share safe session summary to Community feed (sanitized stats only)</span>
              </label>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowFinishModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFinish}>Save Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
