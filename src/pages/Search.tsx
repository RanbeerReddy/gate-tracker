import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const navigate = useNavigate();

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length >= 2) {
      const r = await window.electronAPI.search.global(q);
      setResults(r);
    } else {
      setResults(null);
    }
  };

  const totalResults = results
    ? Object.values(results).reduce((s: number, arr: any) => s + (arr?.length || 0), 0)
    : 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Search</h1>
      </div>

      <div style={{ maxWidth: '600px', marginBottom: 'var(--space-6)' }}>
        <input
          className="form-input"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search subjects, topics, sessions, questions, mistakes..."
          autoFocus
          style={{ fontSize: 'var(--text-lg)', padding: 'var(--space-3) var(--space-4)' }}
        />
      </div>

      {results && (
        <div>
          <div className="text-sm text-secondary mb-4">{totalResults} results for "{query}"</div>
          
          {/* Subjects */}
          {results.subjects?.length > 0 && (
            <div className="section">
              <div className="section-title">Subjects ({results.subjects.length})</div>
              {results.subjects.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 cursor-pointer" style={{ padding: 'var(--space-2)' }}
                  onClick={() => navigate(`/subjects/${s.id}`)}>
                  <span className="color-dot" style={{ background: s.color }} />
                  <span className="text-sm font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Topics */}
          {results.topics?.length > 0 && (
            <div className="section">
              <div className="section-title">Topics ({results.topics.length})</div>
              {results.topics.map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 cursor-pointer" style={{ padding: 'var(--space-2)' }}
                  onClick={() => navigate(`/topics/${t.id}`)}>
                  <span className="color-dot" style={{ background: t.color }} />
                  <span className="text-sm text-secondary">{t.subject_name} →</span>
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sessions */}
          {results.sessions?.length > 0 && (
            <div className="section">
              <div className="section-title">Sessions ({results.sessions.length})</div>
              {results.sessions.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3" style={{ padding: 'var(--space-2)' }}>
                  <span className="color-dot" style={{ background: s.color }} />
                  <span className="text-sm">{s.subject_name}</span>
                  {s.topic_name && <span className="text-sm text-secondary">→ {s.topic_name}</span>}
                  <span className="text-xs text-tertiary">{s.activity_type}</span>
                  <span className="text-xs text-tertiary ml-auto">{new Date(s.start_time).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mock Tests */}
          {results.mocks?.length > 0 && (
            <div className="section">
              <div className="section-title">Mock Tests ({results.mocks.length})</div>
              {results.mocks.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3" style={{ padding: 'var(--space-2)' }}
                  onClick={() => navigate('/mocks')}>
                  <span className="text-sm font-medium">{m.test_name}</span>
                  <span className="text-sm text-secondary">{m.score}/{m.total_marks}</span>
                  <span className="text-xs text-tertiary ml-auto">{m.date}</span>
                </div>
              ))}
            </div>
          )}

          {totalResults === 0 && query.length >= 2 && (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No results found</div>
              <div className="empty-state-text">Try a different search term</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
