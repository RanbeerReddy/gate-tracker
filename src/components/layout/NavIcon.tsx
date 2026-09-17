import React from 'react';

type NavIconName =
  | 'dashboard' | 'study' | 'subjects' | 'questions' | 'mistakes'
  | 'revision' | 'pyqs' | 'mocks' | 'planner' | 'goals' | 'calendar'
  | 'analytics' | 'community' | 'people' | 'search' | 'settings' | 'user';

const ICON_PATHS: Record<NavIconName, string> = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
  study: 'M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  subjects: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 1 6.5 18H20',
  questions: 'M9.5 9a2.5 2.5 0 1 1 4.3 1.8c-.9.8-1.8 1.2-1.8 2.7m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  mistakes: 'm7 7 10 10M17 7 7 17M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  revision: 'M20 11a8 8 0 0 0-14.8-4L3 10m0 0V5m0 5h5m-4 1a8 8 0 0 0 14.8 4L21 14m0 0v5m0-5h-5',
  pyqs: 'M6 3h9l3 3v15H6V3Zm9 0v4h4M9 12h6m-6 4h6',
  mocks: 'M7 3h10v18H7V3Zm3 4h4m-4 4h4m-4 4h4',
  planner: 'M5 5h14v15H5V5Zm3-2v4m8-4v4M5 9h14',
  goals: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2-4.5-4.4 6.2-.9L12 3Z',
  calendar: 'M5 4h14v16H5V4Zm3-2v4m8-4v4M5 9h14M9 13h2m2 0h2m-6 3h2m2 0h2',
  analytics: 'M5 19V9m5 10V5m5 14v-7m5 7V3',
  community: 'M4 5h16v11H8l-4 4V5Zm4 5h.01M12 10h.01M16 10h.01',
  people: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m7-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5-7a4 4 0 0 1 0 8m3 8v-1a4 4 0 0 0-3-3.9',
  search: 'm20 20-4.5-4.5m2.5-5.5a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m9-8h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6',
  user: 'M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
};

export default function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg className="nav-item-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}