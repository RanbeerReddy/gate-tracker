import React, { useState } from 'react';

interface FirstRunProps {
  onComplete: () => void;
}

export default function FirstRun({ onComplete }: FirstRunProps) {
  const [step, setStep] = useState(0);
  const [targetYear, setTargetYear] = useState(String(new Date().getFullYear() + 1));
  const [targetScore, setTargetScore] = useState('');
  const [dailyTarget, setDailyTarget] = useState('7');
  const [theme, setTheme] = useState('dark');

  const handleComplete = async () => {
    await window.electronAPI.setup.complete({
      target_gate_year: targetYear,
      target_score: targetScore,
      daily_study_target_hours: dailyTarget,
      theme,
    });
    if (theme) {
      await window.electronAPI.settings.set('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    onComplete();
  };

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="setup-logo">
          <div className="setup-logo-icon">🎓</div>
          <div>
            <div className="setup-logo-text">GATE Tracker</div>
            <div className="text-secondary text-sm">Your GATE CSE Preparation OS</div>
          </div>
        </div>

        {step === 0 && (
          <>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Welcome!</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-6)' }}>
              Let's set up a few things to get you started. You can change all of this later in Settings.
            </p>
            <div className="form-group">
              <label className="form-label">Target GATE Year</label>
              <select className="form-select" value={targetYear} onChange={e => setTargetYear(e.target.value)}>
                {[0, 1, 2, 3].map(offset => {
                  const y = new Date().getFullYear() + offset;
                  return <option key={y} value={y}>GATE {y}</option>;
                })}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target Score (optional)</label>
              <input
                type="number"
                className="form-input"
                value={targetScore}
                onChange={e => setTargetScore(e.target.value)}
                placeholder="e.g. 55"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Daily Study Target (hours)</label>
              <input
                type="number"
                className="form-input"
                value={dailyTarget}
                onChange={e => setDailyTarget(e.target.value)}
                placeholder="7"
                min="1"
                max="16"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Theme</label>
              <div className="flex gap-2">
                {(['dark', 'light', 'system'] as const).map(t => (
                  <button
                    key={t}
                    className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTheme(t)}
                  >
                    {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '💻 System'}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary btn-lg" onClick={handleComplete}>
                Start Tracking →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
