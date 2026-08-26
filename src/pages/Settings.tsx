import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [tab, setTab] = useState<'general' | 'exam' | 'study' | 'data' | 'about'>('general');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [s, info, b] = await Promise.all([
      window.electronAPI.settings.getAll(),
      window.electronAPI.backup.getDbInfo(),
      window.electronAPI.backup.getAll(),
    ]);
    setSettings(s);
    setDbInfo(info);
    setBackups(b);
  };

  const updateSetting = async (key: string, value: string) => {
    await window.electronAPI.settings.set(key, value);
    setSettings(s => ({ ...s, [key]: value }));
    addToast('Setting updated', 'success');
  };

  const handleUpdateExam = async (date: string, name: string) => {
    await window.electronAPI.settings.set('gate_exam_date', date);
    if (name) await window.electronAPI.settings.set('gate_exam_name', name);
    setSettings(s => ({ ...s, gate_exam_date: date, gate_exam_name: name || s.gate_exam_name }));
    addToast('GATE Exam Date updated', 'success');
  };

  const handleBackup = async () => {
    const result = await window.electronAPI.backup.create();
    if (result.error) {
      addToast(result.error, 'error');
    } else {
      addToast('Backup created successfully', 'success');
      loadData();
    }
  };

  const handleRestore = async () => {
    const result = await window.electronAPI.backup.restore();
    if (result.canceled) return;
    if (result.error) {
      addToast(result.error, 'error');
    } else {
      addToast(result.message || 'Backup restored', 'success');
    }
  };

  const handleExport = async (format: string) => {
    const result = await window.electronAPI.backup.exportData(format);
    if (result.canceled) return;
    if (result.error) {
      addToast(result.error, 'error');
    } else {
      addToast(`Data exported to ${result.path}`, 'success');
    }
  };

  const handleImport = async () => {
    const result = await window.electronAPI.backup.importData();
    if (result.canceled) return;
    if (result.error) {
      addToast(result.error, 'error');
    } else {
      addToast('Data imported successfully', 'success');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>General</button>
        <button className={`tab ${tab === 'exam' ? 'active' : ''}`} onClick={() => setTab('exam')}>🎯 Exam & Calendar</button>
        <button className={`tab ${tab === 'study' ? 'active' : ''}`} onClick={() => setTab('study')}>Study</button>
        <button className={`tab ${tab === 'data' ? 'active' : ''}`} onClick={() => setTab('data')}>Data & Backup</button>
        <button className={`tab ${tab === 'about' ? 'active' : ''}`} onClick={() => setTab('about')}>About</button>
      </div>

      {tab === 'general' && (
        <div style={{ maxWidth: '500px' }}>
          <div className="form-group">
            <label className="form-label">Theme</label>
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map(t => (
                <button key={t} className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTheme(t)}>
                  {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '💻 System'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Target GATE Year</label>
            <select className="form-select" value={settings.target_gate_year || ''} onChange={e => updateSetting('target_gate_year', e.target.value)}>
              {[0, 1, 2, 3].map(offset => {
                const y = new Date().getFullYear() + offset;
                return <option key={y} value={y}>GATE {y}</option>;
              })}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Target Score</label>
            <input className="form-input" value={settings.target_score || ''} onChange={e => updateSetting('target_score', e.target.value)} placeholder="e.g. 75" />
          </div>
        </div>
      )}

      {tab === 'exam' && (
        <div style={{ maxWidth: '500px' }}>
          <div className="form-group">
            <label className="form-label">Target GATE Exam Name</label>
            <input
              className="form-input"
              value={settings.gate_exam_name || 'GATE CSE 2027'}
              onChange={e => updateSetting('gate_exam_name', e.target.value)}
              placeholder="e.g. GATE CSE 2027"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Exact GATE Exam Date *</label>
            <input
              type="date"
              className="form-input"
              value={settings.gate_exam_date || '2027-02-07'}
              onChange={e => handleUpdateExam(e.target.value, settings.gate_exam_name || 'GATE CSE 2027')}
            />
            <div className="text-xs text-tertiary mt-2">
              The Study Calendar and Dashboard countdown will automatically adapt to this date, highlighting the corresponding exam month and placing a star marker on exam day.
            </div>
          </div>
        </div>
      )}

      {tab === 'study' && (
        <div style={{ maxWidth: '500px' }}>
          <div className="form-group">
            <label className="form-label">Daily Study Target (hours)</label>
            <input className="form-input" type="number" value={settings.daily_study_target_hours || '7'}
              onChange={e => updateSetting('daily_study_target_hours', e.target.value)} min="1" max="16" />
          </div>

          <div className="form-group">
            <label className="form-label">Revision Intervals (days, comma-separated)</label>
            <input className="form-input" value={settings.revision_intervals || '1,3,7,14,30'}
              onChange={e => updateSetting('revision_intervals', e.target.value)} placeholder="1,3,7,14,30" />
            <div className="text-xs text-tertiary mt-1">
              Spaced repetition intervals. Poor performance schedules sooner automatically.
            </div>
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div>
          <div className="section">
            <div className="section-title">Backup & Restore</div>
            <div className="card" style={{ maxWidth: '500px' }}>
              <div className="flex gap-3 flex-wrap">
                <button className="btn btn-primary" onClick={handleBackup}>💾 Create Backup</button>
                <button className="btn btn-secondary" onClick={handleRestore}>📂 Restore Backup</button>
              </div>
              {backups.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-secondary mb-2">Recent Backups</div>
                  {backups.slice(0, 5).map((b: any) => (
                    <div key={b.id} className="flex items-center gap-2 text-sm" style={{ padding: '4px 0' }}>
                      <span className="text-tertiary">{new Date(b.created_at).toLocaleString()}</span>
                      <span className="text-tertiary">—</span>
                      <span>{b.filename}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="section">
            <div className="section-title">Export / Import</div>
            <div className="card" style={{ maxWidth: '500px' }}>
              <div className="flex gap-3 flex-wrap">
                <button className="btn btn-secondary" onClick={() => handleExport('json')}>📤 Export JSON</button>
                <button className="btn btn-secondary" onClick={() => handleExport('csv')}>📤 Export CSV</button>
                <button className="btn btn-secondary" onClick={handleImport}>📥 Import JSON</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div style={{ maxWidth: '500px' }}>
          <div className="card">
            <div className="font-bold" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>
              GATE Tracker v1.1.0
            </div>
            <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
              Your personal GATE CSE preparation operating system + Community layer. All personal study data stored locally.
            </div>
            {dbInfo && (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Database Size</span>
                  <span className="font-medium">{dbInfo.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Database Path</span>
                  <span className="font-mono text-xs" style={{ maxWidth: '280px', wordBreak: 'break-all' }}>{dbInfo.path}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Total Sessions</span>
                  <span className="font-medium">{dbInfo.sessions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Total Questions</span>
                  <span className="font-medium">{dbInfo.questions}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
