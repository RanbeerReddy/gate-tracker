import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe API to the renderer via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Subjects
  subjects: {
    getAll: (paper?: string) => ipcRenderer.invoke('subjects:getAll', paper),
    getById: (id: number) => ipcRenderer.invoke('subjects:getById', id),
    create: (data: any) => ipcRenderer.invoke('subjects:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('subjects:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('subjects:delete', id),
    reorder: (ids: number[]) => ipcRenderer.invoke('subjects:reorder', ids),
  },

  // Topics
  topics: {
    getBySubject: (subjectId: number) => ipcRenderer.invoke('topics:getBySubject', subjectId),
    getById: (id: number) => ipcRenderer.invoke('topics:getById', id),
    create: (data: any) => ipcRenderer.invoke('topics:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('topics:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('topics:delete', id),
    updateStatus: (id: number, status: string) => ipcRenderer.invoke('topics:updateStatus', id, status),
  },

  // Subtopics
  subtopics: {
    getByTopic: (topicId: number) => ipcRenderer.invoke('subtopics:getByTopic', topicId),
    create: (data: any) => ipcRenderer.invoke('subtopics:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('subtopics:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('subtopics:delete', id),
  },

  // Study Sessions
  sessions: {
    start: (data: any) => ipcRenderer.invoke('sessions:start', data),
    pause: (id: number) => ipcRenderer.invoke('sessions:pause', id),
    resume: (id: number) => ipcRenderer.invoke('sessions:resume', id),
    finish: (id: number, data: any) => ipcRenderer.invoke('sessions:finish', id, data),
    getActive: () => ipcRenderer.invoke('sessions:getActive'),
    getAll: (filters: any) => ipcRenderer.invoke('sessions:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('sessions:getById', id),
    update: (id: number, data: any) => ipcRenderer.invoke('sessions:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('sessions:delete', id),
    saveActiveState: (data: any) => ipcRenderer.invoke('sessions:saveActiveState', data),
    getActiveState: () => ipcRenderer.invoke('sessions:getActiveState'),
    clearActiveState: () => ipcRenderer.invoke('sessions:clearActiveState'),
  },

  // Planned Sessions
  planner: {
    getByDate: (date: string, paper?: string) => ipcRenderer.invoke('planner:getByDate', date, paper),
    create: (data: any) => ipcRenderer.invoke('planner:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('planner:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('planner:delete', id),
    markCompleted: (id: number, sessionId: number) => ipcRenderer.invoke('planner:markCompleted', id, sessionId),
  },

  // Questions
  questions: {
    create: (data: any) => ipcRenderer.invoke('questions:create', data),
    getAll: (filters: any) => ipcRenderer.invoke('questions:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('questions:getById', id),
    update: (id: number, data: any) => ipcRenderer.invoke('questions:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('questions:delete', id),
    bulkCreate: (dataArr: any[]) => ipcRenderer.invoke('questions:bulkCreate', dataArr),
  },

  // Mistakes
  mistakes: {
    create: (data: any) => ipcRenderer.invoke('mistakes:create', data),
    getAll: (filters: any) => ipcRenderer.invoke('mistakes:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('mistakes:getById', id),
    update: (id: number, data: any) => ipcRenderer.invoke('mistakes:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('mistakes:delete', id),
    resolve: (id: number) => ipcRenderer.invoke('mistakes:resolve', id),
  },

  // Revisions
  revisions: {
    create: (data: any) => ipcRenderer.invoke('revisions:create', data),
    getDue: (paper?: string) => ipcRenderer.invoke('revisions:getDue', paper),
    getByTopic: (topicId: number) => ipcRenderer.invoke('revisions:getByTopic', topicId),
    getAll: (filters: any) => ipcRenderer.invoke('revisions:getAll', filters),
    update: (id: number, data: any) => ipcRenderer.invoke('revisions:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('revisions:delete', id),
    getSchedule: (paper?: string) => ipcRenderer.invoke('revisions:getSchedule', paper),
  },

  // Mock Tests
  mocks: {
    create: (data: any) => ipcRenderer.invoke('mocks:create', data),
    getAll: (paper?: string) => ipcRenderer.invoke('mocks:getAll', paper),
    getById: (id: number) => ipcRenderer.invoke('mocks:getById', id),
    update: (id: number, data: any) => ipcRenderer.invoke('mocks:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('mocks:delete', id),
  },

  // Goals
  goals: {
    create: (data: any) => ipcRenderer.invoke('goals:create', data),
    getAll: (paper?: string) => ipcRenderer.invoke('goals:getAll', paper),
    getActive: (paper?: string) => ipcRenderer.invoke('goals:getActive', paper),
    update: (id: number, data: any) => ipcRenderer.invoke('goals:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('goals:delete', id),
  },

  // Phases
  phases: {
    create: (data: any) => ipcRenderer.invoke('phases:create', data),
    getAll: (paper?: string) => ipcRenderer.invoke('phases:getAll', paper),
    getById: (id: number) => ipcRenderer.invoke('phases:getById', id),
    update: (id: number, data: any) => ipcRenderer.invoke('phases:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('phases:delete', id),
  },

  // Analytics
  analytics: {
    getDashboard: (paper?: string) => ipcRenderer.invoke('analytics:getDashboard', paper),
    getStudyAnalytics: (range: any, paper?: string) => ipcRenderer.invoke('analytics:getStudyAnalytics', range, paper),
    getQuestionAnalytics: (range: any, paper?: string) => ipcRenderer.invoke('analytics:getQuestionAnalytics', range, paper),
    getWeakAreas: (paper?: string) => ipcRenderer.invoke('analytics:getWeakAreas', paper),
    getRecommendations: (paper?: string) => ipcRenderer.invoke('analytics:getRecommendations', paper),
    getHeatmap: (year: number, paper?: string) => ipcRenderer.invoke('analytics:getHeatmap', year, paper),
    getSubjectStats: (subjectId: number) => ipcRenderer.invoke('analytics:getSubjectStats', subjectId),
    getTopicStats: (topicId: number) => ipcRenderer.invoke('analytics:getTopicStats', topicId),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },

  // Backup
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
    exportData: (format: string) => ipcRenderer.invoke('backup:export', format),
    importData: () => ipcRenderer.invoke('backup:import'),
    getAll: () => ipcRenderer.invoke('backup:getAll'),
    getDbInfo: () => ipcRenderer.invoke('backup:getDbInfo'),
  },

  // Search
  search: {
    global: (query: string, paper?: string) => ipcRenderer.invoke('search:global', query, paper),
  },

  // Setup
  setup: {
    isFirstRun: () => ipcRenderer.invoke('setup:isFirstRun'),
    complete: (data: any) => ipcRenderer.invoke('setup:complete', data),
  },

  // Privacy Settings (local cache)
  privacy: {
    get: (userId?: string) => ipcRenderer.invoke('privacy:get', userId),
    set: (settings: any, userId?: string) => ipcRenderer.invoke('privacy:set', { userId, settings }),
  },

  // Calendar & Exam Events
  events: {
    getAll: () => ipcRenderer.invoke('events:getAll'),
    getByDateRange: (range: { startDate: string; endDate: string }) => ipcRenderer.invoke('events:getByDateRange', range),
    create: (data: any) => ipcRenderer.invoke('events:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('events:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('events:delete', id),
    getExamInfo: (paper?: string) => ipcRenderer.invoke('events:getExamInfo', paper),
  },

  // Power / Sleep monitor
  power: {
    onSuspend: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('power:suspend', handler);
      return () => ipcRenderer.removeListener('power:suspend', handler);
    },
    onResume: (callback: (durationSeconds: number) => void) => {
      const handler = (_e: any, duration: number) => callback(duration);
      ipcRenderer.on('power:resume', handler);
      return () => ipcRenderer.removeListener('power:resume', handler);
    },
  },

  // Events from main process
  onForceSaveSession: (callback: () => void) => {
    ipcRenderer.on('force-save-session', callback);
    return () => ipcRenderer.removeListener('force-save-session', callback);
  },
});

