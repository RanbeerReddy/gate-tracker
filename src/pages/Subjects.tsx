import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Subject } from '../types';
import { useToast } from '../contexts/ToastContext';

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    const s = await window.electronAPI.subjects.getAll();
    setSubjects(s);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await window.electronAPI.subjects.create({ name: newName.trim(), color: newColor });
    setNewName('');
    setShowAdd(false);
    loadSubjects();
    addToast('Subject added', 'success');
  };

  const formatHours = (seconds: number) => {
    const h = (seconds || 0) / 3600;
    return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Subjects</h1>
            <p className="page-subtitle">{subjects.length} subjects</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Subject</button>
        </div>
      </div>

      <div className="subject-list">
        {subjects.map(s => (
          <div key={s.id} className="subject-card" onClick={() => navigate(`/subjects/${s.id}`)}>
            <div className="subject-card-color" style={{ background: s.color }} />
            <div className="subject-card-info">
              <div className="subject-card-name">{s.name}</div>
              <div className="subject-card-meta">
                <span>{s.topic_count || 0} topics</span>
                <span>{formatHours(s.total_study_seconds || 0)} studied</span>
                <span>{s.total_questions || 0} questions</span>
              </div>
            </div>
            <div className="subject-card-stats">
              <div className="subject-card-stat">
                <div className="subject-card-stat-value">
                  {s.topic_count && s.topic_count > 0 ? Math.round(((s.completed_topics || 0) / s.topic_count) * 100) : 0}%
                </div>
                <div className="subject-card-stat-label">Complete</div>
              </div>
              <div className="subject-card-stat">
                <div className="subject-card-stat-value">
                  {s.total_questions && s.total_questions > 0
                    ? Math.round(((s.correct_questions || 0) / s.total_questions) * 100) : 0}%
                </div>
                <div className="subject-card-stat-label">Accuracy</div>
              </div>
            </div>
            <div style={{ width: '60px' }}>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{
                  width: `${s.topic_count && s.topic_count > 0 ? ((s.completed_topics || 0) / s.topic_count) * 100 : 0}%`,
                  background: s.color,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Subject</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Subject name" autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                style={{ width: '60px', height: '36px', border: 'none', cursor: 'pointer' }} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Add Subject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
