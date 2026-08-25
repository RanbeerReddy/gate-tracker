import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTimer } from '../../contexts/TimerContext';

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
        {renderSection('System', systemNav)}
      </nav>
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
