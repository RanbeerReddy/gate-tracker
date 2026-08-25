import React, { useState, useEffect } from 'react';
import { Question, Subject } from '../types';

export default function PYQs() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterSubject, setFilterSubject] = useState<number | ''>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterCorrect, setFilterCorrect] = useState('');

  useEffect(() => { loadData(); }, [filterSubject, filterYear, filterCorrect]);

  const loadData = async () => {
    const [s, q] = await Promise.all([
      window.electronAPI.subjects.getAll(),
      window.electronAPI.questions.getAll({
        is_pyq: true,
        subject_id: filterSubject || undefined,
        year: filterYear ? parseInt(filterYear) : undefined,
        is_correct: filterCorrect !== '' ? filterCorrect === '1' : undefined,
      }),
    ]);
    setSubjects(s);
    setQuestions(q);
  };

  const totalCorrect = questions.filter(q => q.is_correct === 1).length;
  const totalWrong = questions.filter(q => q.is_correct === 0).length;
  const accuracy = questions.length > 0 ? Math.round(totalCorrect / questions.length * 100) : 0;

  // Stats by subject
  const bySubject = subjects.map(s => {
    const subQ = questions.filter(q => q.subject_id === s.id);
    const correct = subQ.filter(q => q.is_correct === 1).length;
    return { ...s, total: subQ.length, correct, accuracy: subQ.length > 0 ? Math.round(correct / subQ.length * 100) : 0 };
  }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  // Get unique years
  const years = [...new Set(questions.map(q => q.year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Previous Year Questions</h1>
        <p className="page-subtitle">{questions.length} PYQs tracked</p>
      </div>

      <div className="stats-grid mb-4">
        <div className="stat-card">
          <div className="stat-label">Total PYQs</div>
          <div className="stat-value">{questions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Correct</div>
          <div className="stat-value text-success">{totalCorrect}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Wrong</div>
          <div className="stat-value text-danger">{totalWrong}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accuracy</div>
          <div className="stat-value">{accuracy}%</div>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value ? parseInt(e.target.value) : '')}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="form-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="form-select" value={filterCorrect} onChange={e => setFilterCorrect(e.target.value)}>
          <option value="">All Results</option>
          <option value="1">Correct</option>
          <option value="0">Wrong</option>
        </select>
      </div>

      {bySubject.length > 0 && (
        <div className="section">
          <div className="section-title">By Subject</div>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {bySubject.map(s => (
              <div key={s.id} className="flex items-center gap-3" style={{ padding: 'var(--space-2)' }}>
                <span className="color-dot" style={{ background: s.color }} />
                <span className="text-sm" style={{ width: '200px' }}>{s.name}</span>
                <span className="text-sm font-mono" style={{ width: '60px' }}>{s.total} Qs</span>
                <div className="progress-bar flex-1" style={{ maxWidth: '200px' }}>
                  <div className="progress-bar-fill" style={{ width: `${s.accuracy}%`, background: s.accuracy >= 70 ? 'var(--success)' : s.accuracy >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
                </div>
                <span className="text-sm font-medium" style={{ width: '50px', textAlign: 'right' }}>{s.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Year</th><th>Subject</th><th>Topic</th><th>Result</th><th>Difficulty</th><th>Source</th></tr>
            </thead>
            <tbody>
              {questions.map(q => (
                <tr key={q.id}>
                  <td className="font-mono text-sm">{q.year || '—'}</td>
                  <td><span className="flex items-center gap-2"><span className="color-dot" style={{ background: q.subject_color }} />{q.subject_name}</span></td>
                  <td className="text-sm text-secondary">{q.topic_name || '—'}</td>
                  <td>{q.is_correct === 1 ? <span className="text-success">✓</span> : q.is_correct === 0 ? <span className="text-danger">✗</span> : '—'}</td>
                  <td className="text-sm">{q.difficulty}</td>
                  <td className="text-sm text-tertiary">{q.source || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
