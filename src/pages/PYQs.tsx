import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Question, Subject, Topic } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useTimer } from '../contexts/TimerContext';
import { formatLocalDate } from '../utils/dateUtils';

export default function PYQs() {
  const navigate = useNavigate();
  const { startSession } = useTimer();
  const { addToast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // Filters
  const [filterSubject, setFilterSubject] = useState<number | ''>('');
  const [filterTopic, setFilterTopic] = useState<number | ''>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterCorrect, setFilterCorrect] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Active sub-tab
  const [viewTab, setViewTab] = useState<'analytics' | 'questions'>('analytics');

  // Batch Log Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchSubjectId, setBatchSubjectId] = useState<number | ''>('');
  const [batchTopicId, setBatchTopicId] = useState<number | ''>('');
  const [batchTopics, setBatchTopics] = useState<Topic[]>([]);
  const [batchYear, setBatchYear] = useState(String(new Date().getFullYear()));
  const [batchTotal, setBatchTotal] = useState<number>(10);
  const [batchCorrect, setBatchCorrect] = useState<number>(8);
  const [batchDifficulty, setBatchDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [batchNotes, setBatchNotes] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [filterSubject, filterTopic, filterYear, filterCorrect, filterDifficulty]);

  const loadData = async () => {
    try {
      const [s, q] = await Promise.all([
        window.electronAPI.subjects.getAll(),
        window.electronAPI.questions.getAll({
          is_pyq: true,
          subject_id: filterSubject || undefined,
          topic_id: filterTopic || undefined,
          year: filterYear ? parseInt(filterYear) : undefined,
          is_correct: filterCorrect !== '' ? filterCorrect === '1' : undefined,
          difficulty: filterDifficulty || undefined,
        }),
      ]);
      setSubjects(s || []);
      setQuestions(q || []);

      if (filterSubject) {
        const top = await window.electronAPI.topics.getBySubject(filterSubject as number);
        setTopics(top || []);
      } else {
        setTopics([]);
      }
    } catch (err) {
      console.warn('Error loading PYQs:', err);
    }
  };

  const handleFilterSubjectChange = async (subjId: number | '') => {
    setFilterSubject(subjId);
    setFilterTopic('');
    if (subjId) {
      const top = await window.electronAPI.topics.getBySubject(subjId);
      setTopics(top || []);
    } else {
      setTopics([]);
    }
  };

  const handleBatchSubjectChange = async (subjId: number | '') => {
    setBatchSubjectId(subjId);
    setBatchTopicId('');
    if (subjId) {
      const top = await window.electronAPI.topics.getBySubject(subjId);
      setBatchTopics(top || []);
    } else {
      setBatchTopics([]);
    }
  };

  const handleSaveBatch = async () => {
    if (!batchSubjectId) {
      addToast('Please select a subject', 'warning');
      return;
    }

    const total = Math.max(1, batchTotal);
    const correct = Math.min(Math.max(0, batchCorrect), total);
    const wrong = total - correct;
    const qYear = parseInt(batchYear) || new Date().getFullYear();

    const questionsToInsert: any[] = [];

    // Correct
    for (let i = 0; i < correct; i++) {
      questionsToInsert.push({
        source: `GATE ${qYear}`,
        year: qYear,
        subject_id: batchSubjectId,
        topic_id: batchTopicId || null,
        difficulty: batchDifficulty,
        question_type: 'mcq',
        is_correct: 1,
        confidence: 'high',
        is_pyq: 1,
        notes: batchNotes || null,
      });
    }

    // Wrong
    for (let i = 0; i < wrong; i++) {
      questionsToInsert.push({
        source: `GATE ${qYear}`,
        year: qYear,
        subject_id: batchSubjectId,
        topic_id: batchTopicId || null,
        difficulty: batchDifficulty,
        question_type: 'mcq',
        is_correct: 0,
        confidence: 'low',
        is_pyq: 1,
        notes: batchNotes || null,
      });
    }

    try {
      await window.electronAPI.questions.bulkCreate(questionsToInsert);
      setShowBatchModal(false);
      await loadData();
      addToast(`Logged ${total} PYQs (${correct} correct, ${Math.round(correct/total*100)}% accuracy)!`, 'success');
    } catch (err: any) {
      addToast(`Failed to log PYQs: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await window.electronAPI.questions.delete(id);
      loadData();
      addToast('Question deleted', 'info');
    } catch (err) {
      addToast('Error deleting question', 'error');
    }
  };

  const handleStartPYQTimer = async (subjectId?: number, subjectName?: string) => {
    const targetSubjId = subjectId || (subjects.length > 0 ? subjects[0].id : 1);
    const targetSubjName = subjectName || (subjects.find(s => s.id === targetSubjId)?.name || 'PYQ Practice');

    await startSession({
      subjectId: targetSubjId,
      activityType: 'pyqs',
      subjectName: targetSubjName,
    });
    addToast(`PYQ Practice Timer started for ${targetSubjName}!`, 'success');
    navigate('/study');
  };

  // Metrics Calculations
  const totalPYQs = questions.length;
  const totalCorrect = questions.filter(q => q.is_correct === 1).length;
  const totalWrong = questions.filter(q => q.is_correct === 0).length;
  const overallAccuracy = totalPYQs > 0 ? Math.round((totalCorrect / totalPYQs) * 100) : 0;

  // Stats by Subject
  const bySubject = subjects.map(s => {
    const subQ = questions.filter(q => q.subject_id === s.id);
    const correct = subQ.filter(q => q.is_correct === 1).length;
    const wrong = subQ.filter(q => q.is_correct === 0).length;
    const accuracy = subQ.length > 0 ? Math.round((correct / subQ.length) * 100) : 0;
    return {
      ...s,
      total: subQ.length,
      correct,
      wrong,
      accuracy,
    };
  }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  // Stats by Year
  const uniqueYears = [...new Set(questions.map(q => q.year).filter(Boolean) as number[])].sort((a, b) => b - a);
  const byYear = uniqueYears.map(year => {
    const yQ = questions.filter(q => q.year === year);
    const correct = yQ.filter(q => q.is_correct === 1).length;
    const wrong = yQ.filter(q => q.is_correct === 0).length;
    const accuracy = yQ.length > 0 ? Math.round((correct / yQ.length) * 100) : 0;
    return {
      year,
      total: yQ.length,
      correct,
      wrong,
      accuracy,
    };
  });

  // Stats by Difficulty
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
  const byDifficulty = difficulties.map(diff => {
    const dQ = questions.filter(q => q.difficulty === diff);
    const correct = dQ.filter(q => q.is_correct === 1).length;
    const accuracy = dQ.length > 0 ? Math.round((correct / dQ.length) * 100) : 0;
    return {
      difficulty: diff,
      total: dQ.length,
      correct,
      accuracy,
    };
  });

  // Filtered questions for table search
  const filteredTableQuestions = questions.filter(q => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.topic_name?.toLowerCase().includes(query) ||
      q.subject_name?.toLowerCase().includes(query) ||
      q.notes?.toLowerCase().includes(query) ||
      String(q.year || '').includes(query)
    );
  });

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Previous Year Questions (PYQs)</h1>
            <p className="page-subtitle">Track accuracy, analyze year-wise coverage, and master GATE PYQs</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary" onClick={() => setShowBatchModal(true)}>
              + Log PYQs Batch
            </button>
            <button className="btn btn-primary" onClick={() => handleStartPYQTimer(filterSubject || undefined)}>
              ⏱️ Start PYQ Timer
            </button>
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="stats-grid mb-5">
        <div className="stat-card">
          <div className="stat-label">Total PYQs Solved</div>
          <div className="stat-value text-accent">{totalPYQs}</div>
          <div className="text-xs text-secondary mt-1">Across all GATE papers</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Correct Answers</div>
          <div className="stat-value text-success">{totalCorrect}</div>
          <div className="text-xs text-secondary mt-1">
            {totalPYQs > 0 ? `${Math.round((totalCorrect / totalPYQs) * 100)}% accuracy rate` : '0%'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Mistakes / Wrong</div>
          <div className="stat-value text-danger">{totalWrong}</div>
          <div className="text-xs text-secondary mt-1">Review in Mistakes tab</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Overall PYQ Accuracy</div>
          <div
            className="stat-value"
            style={{
              color: overallAccuracy >= 75 ? 'var(--success)' : overallAccuracy >= 50 ? 'var(--warning)' : 'var(--danger)',
            }}
          >
            {overallAccuracy}%
          </div>
          <div className="text-xs text-secondary mt-1">
            {overallAccuracy >= 75 ? '🎯 Excellent' : overallAccuracy >= 50 ? '⚡ Good Progress' : '📚 Needs Practice'}
          </div>
        </div>
      </div>

      {/* Sub Tabs: Analytics vs Table */}
      <div className="tabs mb-4">
        <button className={`tab ${viewTab === 'analytics' ? 'active' : ''}`} onClick={() => setViewTab('analytics')}>
          📊 PYQ Accuracy Analytics & Breakdown
        </button>
        <button className={`tab ${viewTab === 'questions' ? 'active' : ''}`} onClick={() => setViewTab('questions')}>
          📋 Question Log & History ({questions.length})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar mb-4" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={filterSubject}
          onChange={e => handleFilterSubjectChange(e.target.value ? parseInt(e.target.value) : '')}
        >
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {topics.length > 0 && (
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={filterTopic}
            onChange={e => setFilterTopic(e.target.value ? parseInt(e.target.value) : '')}
          >
            <option value="">All Topics</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
        >
          <option value="">All Years</option>
          {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map(y => (
            <option key={y} value={y}>GATE {y}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={filterCorrect}
          onChange={e => setFilterCorrect(e.target.value)}
        >
          <option value="">All Results</option>
          <option value="1">✓ Correct Only</option>
          <option value="0">✗ Wrong Only</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={filterDifficulty}
          onChange={e => setFilterDifficulty(e.target.value)}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <input
          type="text"
          className="form-input"
          placeholder="Search topic or notes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '180px' }}
        />
      </div>

      {/* VIEW TAB 1: Analytics & Breakdown */}
      {viewTab === 'analytics' && (
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {totalPYQs === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-12) var(--space-4)', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>📝</div>
              <h3 className="text-lg font-bold mb-1">No PYQs Tracked Yet</h3>
              <p className="text-secondary text-sm max-w-md mx-auto mb-4">
                Start a study session with the "PYQs" activity, or click "+ Log PYQs Batch" to log your practice!
              </p>
              <div className="flex justify-center gap-2">
                <button className="btn btn-primary" onClick={() => handleStartPYQTimer()}>
                  ⏱️ Start PYQ Session
                </button>
                <button className="btn btn-secondary" onClick={() => setShowBatchModal(true)}>
                  + Log PYQ Batch
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Subject Accuracy Progress Grid */}
              <div className="card">
                <div className="card-header mb-3">
                  <h3 className="card-title text-base font-bold">Accuracy & Mastery by Subject</h3>
                  <span className="text-xs text-secondary">Breakdown of solved PYQs across subjects</span>
                </div>

                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {bySubject.map(s => {
                    const barColor = s.accuracy >= 75 ? 'var(--success)' : s.accuracy >= 50 ? 'var(--accent)' : 'var(--danger)';
                    return (
                      <div key={s.id} style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="color-dot" style={{ background: s.color }} />
                            <span className="font-semibold text-sm">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-secondary font-mono">
                              <strong className="text-success">{s.correct}</strong> / {s.total} Qs
                            </span>
                            <span className="font-bold font-mono text-sm" style={{ color: barColor, minWidth: '45px', textAlign: 'right' }}>
                              {s.accuracy}%
                            </span>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 6px', fontSize: '11px' }}
                              onClick={() => handleStartPYQTimer(s.id, s.name)}
                              title="Practice this subject"
                            >
                              ⏱️ Practice
                            </button>
                          </div>
                        </div>

                        <div className="progress-bar progress-bar-lg">
                          <div className="progress-bar-fill" style={{ width: `${s.accuracy}%`, background: barColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Year-by-Year Breakdown & Difficulty Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
                {/* Year-by-Year */}
                <div className="card">
                  <div className="card-header mb-3">
                    <h3 className="card-title text-base font-bold">Accuracy by GATE Exam Year</h3>
                    <span className="text-xs text-secondary">Yearly PYQ performance</span>
                  </div>

                  {byYear.length === 0 ? (
                    <div className="text-secondary text-xs">No year data recorded yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                      {byYear.map(y => {
                        const yColor = y.accuracy >= 75 ? 'var(--success)' : y.accuracy >= 50 ? 'var(--warning)' : 'var(--danger)';
                        return (
                          <div key={y.year} className="flex items-center justify-between" style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--border-primary)' }}>
                            <span className="font-bold font-mono text-sm">GATE {y.year}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-secondary font-mono">
                                {y.correct}/{y.total} Qs
                              </span>
                              <div className="progress-bar" style={{ width: '80px' }}>
                                <div className="progress-bar-fill" style={{ width: `${y.accuracy}%`, background: yColor }} />
                              </div>
                              <span className="font-bold font-mono text-xs" style={{ color: yColor, width: '40px', textAlign: 'right' }}>
                                {y.accuracy}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Difficulty Breakdown */}
                <div className="card">
                  <div className="card-header mb-3">
                    <h3 className="card-title text-base font-bold">Accuracy by Difficulty</h3>
                    <span className="text-xs text-secondary">Easy, Medium, Hard breakdown</span>
                  </div>

                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    {byDifficulty.map(d => {
                      const dColor = d.difficulty === 'easy' ? 'var(--success)' : d.difficulty === 'medium' ? 'var(--warning)' : 'var(--danger)';
                      return (
                        <div key={d.difficulty} style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs uppercase tracking-wider" style={{ color: dColor }}>
                              {d.difficulty} Difficulty
                            </span>
                            <span className="font-bold font-mono text-sm">
                              {d.accuracy}% ({d.correct}/{d.total})
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${d.accuracy}%`, background: dColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW TAB 2: Question Log Table */}
      {viewTab === 'questions' && (
        <div className="card" style={{ padding: 0 }}>
          {filteredTableQuestions.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="text-secondary text-sm">No PYQs match the selected filters.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Subject</th>
                  <th>Topic</th>
                  <th>Result</th>
                  <th>Difficulty</th>
                  <th>Notes / Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableQuestions.map(q => (
                  <tr key={q.id}>
                    <td className="font-mono text-xs font-bold text-accent">
                      {q.year ? `GATE ${q.year}` : '—'}
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="color-dot" style={{ background: q.subject_color }} />
                        <span className="font-medium text-xs">{q.subject_name}</span>
                      </span>
                    </td>
                    <td className="text-xs text-secondary font-medium">{q.topic_name || '—'}</td>
                    <td>
                      {q.is_correct === 1 ? (
                        <span className="tag" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                          ✓ Correct
                        </span>
                      ) : (
                        <span className="tag" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)' }}>
                          ✗ Wrong
                        </span>
                      )}
                    </td>
                    <td className="text-xs capitalize">{q.difficulty || 'medium'}</td>
                    <td className="text-xs text-secondary max-w-xs truncate">{q.notes || q.source || '—'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm text-secondary"
                        onClick={() => handleDelete(q.id)}
                        title="Delete record"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Batch Log Modal */}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Log PYQ Batch</h2>
              <button className="modal-close" onClick={() => setShowBatchModal(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select
                className="form-select"
                value={batchSubjectId}
                onChange={e => handleBatchSubjectChange(e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Topic (optional)</label>
              <select
                className="form-select"
                value={batchTopicId}
                onChange={e => setBatchTopicId(e.target.value ? parseInt(e.target.value) : '')}
              >
                <option value="">All / Multiple topics</option>
                {batchTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">GATE Exam Year</label>
                <select className="form-select" value={batchYear} onChange={e => setBatchYear(e.target.value)}>
                  {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map(y => (
                    <option key={y} value={y}>GATE {y}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Difficulty</label>
                <select className="form-select" value={batchDifficulty} onChange={e => setBatchDifficulty(e.target.value as any)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Total Questions Solved</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={batchTotal}
                  onChange={e => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setBatchTotal(val);
                    if (batchCorrect > val) setBatchCorrect(val);
                  }}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label text-success">✓ Correct</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max={batchTotal}
                  value={batchCorrect}
                  onChange={e => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setBatchCorrect(Math.min(val, batchTotal));
                  }}
                />
              </div>

              <div className="form-group" style={{ width: '80px' }}>
                <label className="form-label text-danger">✗ Wrong</label>
                <div className="form-input" style={{ background: 'var(--bg-tertiary)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {Math.max(0, batchTotal - batchCorrect)}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                value={batchNotes}
                onChange={e => setBatchNotes(e.target.value)}
                placeholder="Any special remarks or mistake insights from this PYQ set..."
              />
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveBatch}>Save PYQs</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
