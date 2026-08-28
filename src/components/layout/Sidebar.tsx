import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTimer } from '../../contexts/TimerContext';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  badge?: number;
}

interface SidebarProps {
  revisionDueCount?: number;
}

export default function Sidebar({ revisionDueCount = 0 }: SidebarProps) {
  const { timer } = useTimer();
  const { user, profile, mode, isLoading } = useAuth();
  const [activePaper, setActivePaper] = useState<string>('CS');

  useEffect(() => {
    window.electronAPI.settings.get('gate_paper').then(p => {
      if (p) setActivePaper(p);
    });
  }, []);

  // Build safe display values — never show "undefined"
  const userInitial = profile?.display_name?.[0]?.toUpperCase()
    || profile?.username?.[0]?.toUpperCase()
    || user?.email?.[0]?.toUpperCase()
    || 'U';
  const displayName = profile?.display_name
    || (profile?.username ? `@${profile.username}` : null)
    || user?.email?.split('@')[0]
    || 'Signed In';
  const displaySub = profile?.target_gate_year
    ? `GATE ${profile.gate_paper || activePaper} ${profile.target_gate_year}`
    : `GATE ${activePaper}`;

  const mainNav: NavItem[] = [
    { path: '/', icon: '📊', label: 'Dashboard' },
    { path: '/study', icon: '⏱️', label: 'Study' },
    { path: '/subjects', icon: '📚', label: 'Subjects' },
  ];

  const trackingNav: NavItem[] = [
    { path: '/questions', icon: '❓', label: 'Questions' },
    { path: '/mistakes', icon: '❌', label: 'Mistakes' },
    { path: '/revision', icon: '🔄', label: 'Revision', badge: revisionDueCount > 0 ? revisionDueCount : undefined },
    { path: '/pyqs', icon: '📝', label: 'PYQs' },
    { path: '/mocks', icon: '📋', label: 'Mock Tests' },
  ];

  const planningNav: NavItem[] = [
    { path: '/planner', icon: '📅', label: 'Planner' },
    { path: '/goals', icon: '🎯', label: 'Goals' },
    { path: '/calendar', icon: '📆', label: 'Calendar' },
    { path: '/analytics', icon: '📈', label: 'Analytics' },
  ];

  const socialNav: NavItem[] = [
    { path: '/community', icon: '💬', label: 'Community' },
    { path: '/people', icon: '👥', label: 'People' },
  ];

  const systemNav: NavItem[] = [
    { path: '/search', icon: '🔍', label: 'Search' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
  ];

  const renderSection = (label: string, items: NavItem[]) => (
    <div className="sidebar-section">
      <div className="sidebar-section-label">{label}</div>
      {items.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          end={item.path === '/'}
        >
          <span className="nav-item-icon">{item.icon}</span>
          <span>{item.label}</span>
          {item.badge && <span className="nav-item-badge">{item.badge}</span>}
        </NavLink>
      ))}
    </div>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <span>GATE Tracker</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {renderSection('Main', mainNav)}
        {renderSection('Tracking', trackingNav)}
        {renderSection('Planning', planningNav)}
        {renderSection('Social', socialNav)}
        {renderSection('System', systemNav)}
      </nav>

      {/* User Profile / Account Entry Control */}
      <div style={{ padding: 'var(--space-2) var(--space-3)', borderTop: '1px solid var(--border-primary)' }}>
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)' }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: mode === 'authenticated' ? 'var(--accent)' : 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {mode === 'authenticated' ? userInitial : '👤'}
          </div>
          <div className="truncate" style={{ flex: 1, fontSize: 'var(--text-xs)' }}>
            <div className="font-semibold text-primary truncate">
              {mode === 'authenticated' ? displayName : 'Local Mode'}
            </div>
            <div className="text-tertiary" style={{ fontSize: '10px' }}>
              {mode === 'authenticated' ? displaySub : 'Sign In'}
            </div>
          </div>
        </NavLink>
      </div>

      {timer.isRunning && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--border-primary)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: timer.isPaused ? 'var(--warning)' : 'var(--success)',
              animation: timer.isPaused ? 'none' : 'pulse 2s infinite',
            }} />
            <span>{timer.isPaused ? 'Paused' : 'Studying'}</span>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            {timer.subjectName}
          </div>
        </div>
      )}
    </div>
  );
}
