import React, { useState } from 'react';
import { GATE_PAPERS } from '../config/gatePapers';
import { GatePaperCode } from '../types';

interface FirstRunProps {
  onComplete: () => void;
}

export default function FirstRun({ onComplete }: FirstRunProps) {
  const [step, setStep] = useState(0);
  const [selectedPaper, setSelectedPaper] = useState<GatePaperCode>('CS');
  const [targetYear, setTargetYear] = useState(String(new Date().getFullYear() + 1));
  const [targetScore, setTargetScore] = useState('');
  const [targetRank, setTargetRank] = useState('');
  const [dailyTarget, setDailyTarget] = useState('7');
  const [theme, setTheme] = useState('dark');

  const handleComplete = async () => {
    const defaultExamName = selectedPaper === 'EC' ? `GATE EC ${targetYear}` : `GATE CS ${targetYear}`;
    await window.electronAPI.setup.complete({
      gate_paper: selectedPaper,
      target_gate_year: targetYear,
      target_score: targetScore,
      target_rank: targetRank,
      daily_study_target_hours: dailyTarget,
      gate_exam_name: defaultExamName,
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
      <div className="setup-card" style={{ maxWidth: step === 0 ? '680px' : '560px' }}>
        <div className="setup-logo">
          <div className="setup-logo-icon">🎓</div>
          <div>
            <div className="setup-logo-text">GATE Tracker</div>
            <div className="text-secondary text-sm">Multi-Paper GATE Preparation OS</div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`badge ${step === 0 ? 'badge-primary' : 'badge-subtle'}`}>1. Select Paper</div>
          <span className="text-tertiary">→</span>
          <div className={`badge ${step === 1 ? 'badge-primary' : 'badge-subtle'}`}>2. Goals & Preferences</div>
        </div>

        {step === 0 && (
          <>
            <h3 style={{ marginBottom: 'var(--space-2)', textAlign: 'center' }}>Choose Your GATE Paper</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
              Select the official GATE track you are preparing for. You can change this later in Settings.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              {/* GATE CS Card */}
              <div
                className="card cursor-pointer"
                onClick={() => setSelectedPaper('CS')}
                style={{
                  padding: 'var(--space-5)',
                  border: selectedPaper === 'CS' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                  background: selectedPaper === 'CS' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="tag" style={{ background: '#3B82F6', color: '#fff', fontWeight: 600 }}>
                    GATE CS
                  </span>
                  <span className="text-xs text-secondary font-mono">CSE / IT</span>
                </div>
                <h4 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  Computer Science & IT
                </h4>
                <p className="text-xs text-secondary leading-relaxed mb-3">
                  Algorithms, Data Structures, Operating Systems, DBMS, TOC, Networks, Digital Logic, C & Math.
                </p>
                <div className="text-xs font-semibold" style={{ color: selectedPaper === 'CS' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {selectedPaper === 'CS' ? '✓ Selected Track' : 'Click to select'}
                </div>
              </div>

              {/* GATE EC Card */}
              <div
                className="card cursor-pointer"
                onClick={() => setSelectedPaper('EC')}
                style={{
                  padding: 'var(--space-5)',
                  border: selectedPaper === 'EC' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                  background: selectedPaper === 'EC' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="tag" style={{ background: '#10B981', color: '#fff', fontWeight: 600 }}>
                    GATE EC
                  </span>
                  <span className="text-xs text-secondary font-mono">ENTC / ECE</span>
                </div>
                <h4 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  Electronics & Communication
                </h4>
                <p className="text-xs text-secondary leading-relaxed mb-3">
                  Signals & Systems, Electronic Devices, Analog & Digital Circuits, Control Systems, Communications & EM.
                </p>
                <div className="text-xs font-semibold" style={{ color: selectedPaper === 'EC' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {selectedPaper === 'EC' ? '✓ Selected Track' : 'Click to select'}
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
                Continue with {GATE_PAPERS[selectedPaper].shortLabel} →
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Preparation Goals</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-6)' }}>
              Configure targets for {GATE_PAPERS[selectedPaper].officialLabel}.
            </p>

            <div className="form-group">
              <label className="form-label">Target GATE Year</label>
              <select className="form-select" value={targetYear} onChange={e => setTargetYear(e.target.value)}>
                {[0, 1, 2, 3].map(offset => {
                  const y = new Date().getFullYear() + offset;
                  return <option key={y} value={y}>GATE {selectedPaper} {y}</option>;
                })}
              </select>
            </div>

            <div className="grid grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Target Score (optional)</label>
                <input
                  type="number"
                  className="form-input"
                  value={targetScore}
                  onChange={e => setTargetScore(e.target.value)}
                  placeholder="e.g. 75"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Rank (AIR, optional)</label>
                <input
                  type="number"
                  className="form-input"
                  value={targetRank}
                  onChange={e => setTargetRank(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
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
                    type="button"
                    className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTheme(t)}
                  >
                    {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '💻 System'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions flex justify-between items-center mt-6">
              <button className="btn btn-secondary" onClick={() => setStep(0)}>
                ← Back
              </button>
              <button className="btn btn-primary btn-lg" onClick={handleComplete}>
                Start {GATE_PAPERS[selectedPaper].shortLabel} Prep →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

