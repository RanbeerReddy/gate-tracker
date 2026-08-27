// ========== Database Entity Types ==========

export interface Subject {
  id: number;
  name: string;
  color: string;
  display_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
  // Computed
  topic_count?: number;
  completed_topics?: number;
  total_study_seconds?: number;
  total_questions?: number;
  correct_questions?: number;
}

export interface Topic {
  id: number;
  subject_id: number;
  name: string;
  display_order: number;
  status: TopicStatus;
  confidence: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  subject_name?: string;
  subject_color?: string;
  subtopic_count?: number;
  total_study_seconds?: number;
  total_questions?: number;
  correct_questions?: number;
  last_revision?: string | null;
  next_revision?: string | null;
  revision_count?: number;
  unresolved_mistakes?: number;
}

export type TopicStatus = 'not_started' | 'learning' | 'completed' | 'needs_revision' | 'strong';

export interface Subtopic {
  id: number;
  topic_id: number;
  name: string;
  display_order: number;
  created_at: string;
}

export interface StudySession {
  id: number;
  subject_id: number | null;
  topic_id: number | null;
  subtopic_id: number | null;
  activity_type: ActivityType;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  pause_duration_seconds: number;
  notes: string | null;
  questions_solved: number;
  focus_rating: number | null;
  is_active: number;
  created_at: string;
  // Computed
  subject_name?: string;
  subject_color?: string;
  topic_name?: string;
  subtopic_name?: string;
}

export type ActivityType = 'learning' | 'revision' | 'pyqs' | 'practice' | 'mock_test' | 'analysis' | 'notes' | 'doubt_solving';

export interface PlannedSession {
  id: number;
  date: string;
  subject_id: number;
  topic_id: number | null;
  subtopic_id: number | null;
  activity_type: ActivityType;
  start_time: string;
  end_time: string;
  notes: string | null;
  is_completed: number;
  linked_session_id: number | null;
  created_at: string;
  // Computed
  subject_name?: string;
  subject_color?: string;
  topic_name?: string;
  subtopic_name?: string;
}

export interface Question {
  id: number;
  source: string | null;
  year: number | null;
  subject_id: number | null;
  topic_id: number | null;
  subtopic_id: number | null;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'mcq' | 'msa' | 'nat';
  is_correct: number | null;
  time_seconds: number | null;
  confidence: 'low' | 'medium' | 'high';
  is_pyq: number;
  notes: string | null;
  created_at: string;
  // Computed
  subject_name?: string;
  subject_color?: string;
  topic_name?: string;
  subtopic_name?: string;
}

export interface Mistake {
  id: number;
  question_id: number | null;
  subject_id: number | null;
  topic_id: number | null;
  category: MistakeCategory;
  explanation: string | null;
  correction: string | null;
  what_to_notice: string | null;
  is_resolved: number;
  revision_date: string | null;
  created_at: string;
  // Computed
  subject_name?: string;
  subject_color?: string;
  topic_name?: string;
}

export type MistakeCategory =
  | 'conceptual'
  | 'calculation'
  | 'misread'
  | 'silly'
  | 'forgot_concept'
  | 'forgot_formula'
  | 'time_pressure'
  | 'wrong_approach'
  | 'guess'
  | 'lack_of_practice'
  | 'other';

export const MISTAKE_CATEGORIES: { value: MistakeCategory; label: string }[] = [
  { value: 'conceptual', label: 'Conceptual Misunderstanding' },
  { value: 'calculation', label: 'Calculation Error' },
  { value: 'misread', label: 'Misread Question' },
  { value: 'silly', label: 'Silly Mistake' },
  { value: 'forgot_concept', label: 'Forgot Concept' },
  { value: 'forgot_formula', label: 'Forgot Formula/Fact' },
  { value: 'time_pressure', label: 'Time Pressure' },
  { value: 'wrong_approach', label: 'Wrong Approach' },
  { value: 'guess', label: 'Guess' },
  { value: 'lack_of_practice', label: 'Lack of Practice' },
  { value: 'other', label: 'Other' },
];

export interface Revision {
  id: number;
  topic_id: number;
  subtopic_id: number | null;
  revision_date: string;
  performance_rating: number | null;
  confidence: number | null;
  notes: string | null;
  next_revision_date: string | null;
  revision_number: number;
  created_at: string;
  // Computed
  topic_name?: string;
  subject_name?: string;
  subject_color?: string;
  topic_status?: string;
  topic_confidence?: number;
}

export interface MockTest {
  id: number;
  date: string;
  test_name: string;
  total_marks: number;
  score: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  negative_marks: number;
  time_minutes: number | null;
  notes: string | null;
  created_at: string;
  sections?: MockTestSection[];
}

export interface MockTestSection {
  id: number;
  mock_test_id: number;
  subject_id: number | null;
  marks_obtained: number;
  total_marks: number;
  correct: number;
  wrong: number;
  attempted: number;
  subject_name?: string;
  subject_color?: string;
}

export interface Goal {
  id: number;
  type: 'daily' | 'weekly' | 'monthly' | 'phase' | 'overall';
  metric: 'study_hours' | 'questions' | 'accuracy' | 'completion';
  target_value: number;
  current_value: number;
  start_date: string | null;
  end_date: string | null;
  is_active: number;
  notes: string | null;
  created_at: string;
}

export interface Phase {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  is_active: number;
  created_at: string;
  subjects?: PhaseSubject[];
}

export interface PhaseSubject {
  id: number;
  phase_id: number;
  subject_id: number;
  target_completion: number;
  subject_name?: string;
  subject_color?: string;
}

// ========== Activity Types ==========

export const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'learning', label: 'Learning', icon: '📖' },
  { value: 'revision', label: 'Revision', icon: '🔄' },
  { value: 'pyqs', label: 'PYQs', icon: '📝' },
  { value: 'practice', label: 'Practice', icon: '✏️' },
  { value: 'mock_test', label: 'Mock Test', icon: '📋' },
  { value: 'analysis', label: 'Analysis', icon: '📊' },
  { value: 'notes', label: 'Notes', icon: '📒' },
  { value: 'doubt_solving', label: 'Doubt Solving', icon: '❓' },
];

export const TOPIC_STATUSES: { value: TopicStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: '#6B7280' },
  { value: 'learning', label: 'Learning', color: '#3B82F6' },
  { value: 'completed', label: 'Completed', color: '#10B981' },
  { value: 'needs_revision', label: 'Needs Revision', color: '#F59E0B' },
  { value: 'strong', label: 'Strong', color: '#8B5CF6' },
];

// ========== Calendar & Exam Event Types ==========

export interface CalendarEvent {
  id: number;
  name: string;
  event_date: string;
  end_date: string | null;
  color: string;
  event_type: 'exam' | 'mock_test' | 'revision_deadline' | 'phase_deadline' | 'custom';
  description: string | null;
  is_exam: number;
  is_active: number;
  created_at: string;
}

export interface ExamInfo {
  examDate: string;
  examName: string;
  daysRemaining: number;
  isPast: boolean;
  event: CalendarEvent | null;
}

// ========== Social & Community Types ==========

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  target_gate_year: number | null;
  target_score: number | null;
  created_at: string;
  updated_at: string;
  // Attached privacy & progress (if permitted)
  privacy?: PrivacySettings;
  progress?: SharedProgress;
  is_friend?: boolean;
  friendship_status?: 'pending' | 'accepted' | 'none';
}

export interface PrivacySettings {
  user_id: string;
  share_profile: boolean;
  share_calendar: boolean;
  share_study_hours: boolean;
  share_question_stats: boolean;
  share_syllabus_progress: boolean;
  share_mock_performance: boolean;
  share_subject_progress: boolean;
  visibility: 'public' | 'friends' | 'private';
  updated_at?: string;
}

export interface SharedProgress {
  user_id: string;
  total_study_hours: number;
  days_studied: number;
  current_streak: number;
  questions_solved: number;
  overall_accuracy: number;
  syllabus_completion: number;
  subject_progress: { name: string; color: string; completion: number; hours: number }[];
  updated_at: string;
}

export interface SharedCalendarDay {
  id?: string;
  user_id: string;
  date: string;
  study_hours: number;
  studied: boolean;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  subject_tag: string | null;
  shared_stats: {
    subject_name?: string;
    hours_studied?: number;
    questions_solved?: number;
    accuracy?: number;
    activity_type?: string;
  } | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  // Computed / Joined
  author?: UserProfile;
  has_liked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: UserProfile;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
  friend_profile?: UserProfile;
}

// ========== Dashboard Types ==========

export interface DashboardData {
  today: {
    studySeconds: number;
    sessions: number;
    questionsSolved: number;
    questionsCorrect: number;
    accuracy: number;
    subjects: { name: string; color: string }[];
  };
  week: {
    studySeconds: number;
    daysStudied: number;
    sessions: number;
    avgDailySeconds: number;
    questionsSolved: number;
    questionsCorrect: number;
    accuracy: number;
  };
  syllabus: {
    total_topics: number;
    completed: number;
    learning: number;
    needs_revision: number;
    not_started: number;
  };
  subjectCompletion: any[];
  recentMocks: any[];
  revisionDueCount: number;
  weakTopics: any[];
}

export interface Recommendation {
  type: string;
  priority: string;
  title: string;
  reason: string;
  topic_id?: number;
  color?: string;
}

// ========== Electron API Type ==========

export interface ElectronAPI {
  subjects: {
    getAll: () => Promise<Subject[]>;
    getById: (id: number) => Promise<Subject>;
    create: (data: Partial<Subject>) => Promise<Subject>;
    update: (id: number, data: Partial<Subject>) => Promise<Subject>;
    delete: (id: number) => Promise<void>;
    reorder: (ids: number[]) => Promise<void>;
  };
  topics: {
    getBySubject: (subjectId: number) => Promise<Topic[]>;
    getById: (id: number) => Promise<Topic>;
    create: (data: Partial<Topic>) => Promise<Topic>;
    update: (id: number, data: Partial<Topic>) => Promise<Topic>;
    delete: (id: number) => Promise<void>;
    updateStatus: (id: number, status: string) => Promise<Topic>;
  };
  subtopics: {
    getByTopic: (topicId: number) => Promise<Subtopic[]>;
    create: (data: Partial<Subtopic>) => Promise<Subtopic>;
    update: (id: number, data: Partial<Subtopic>) => Promise<Subtopic>;
    delete: (id: number) => Promise<void>;
  };
  sessions: {
    start: (data: any) => Promise<StudySession>;
    pause: (id: number) => Promise<StudySession>;
    resume: (id: number) => Promise<StudySession>;
    finish: (id: number, data: any) => Promise<StudySession>;
    getActive: () => Promise<StudySession | null>;
    getAll: (filters?: any) => Promise<StudySession[]>;
    getById: (id: number) => Promise<StudySession>;
    update: (id: number, data: any) => Promise<StudySession>;
    delete: (id: number) => Promise<void>;
    saveActiveState: (data: any) => Promise<void>;
    getActiveState: () => Promise<any>;
    clearActiveState: () => Promise<void>;
  };
  planner: {
    getByDate: (date: string) => Promise<PlannedSession[]>;
    create: (data: any) => Promise<PlannedSession>;
    update: (id: number, data: any) => Promise<PlannedSession>;
    delete: (id: number) => Promise<void>;
    markCompleted: (id: number, sessionId: number) => Promise<void>;
  };
  questions: {
    create: (data: any) => Promise<Question>;
    getAll: (filters?: any) => Promise<Question[]>;
    getById: (id: number) => Promise<Question>;
    update: (id: number, data: any) => Promise<Question>;
    delete: (id: number) => Promise<void>;
    bulkCreate: (data: any[]) => Promise<{ inserted: number }>;
  };
  mistakes: {
    create: (data: any) => Promise<Mistake>;
    getAll: (filters?: any) => Promise<Mistake[]>;
    getById: (id: number) => Promise<Mistake>;
    update: (id: number, data: any) => Promise<Mistake>;
    delete: (id: number) => Promise<void>;
    resolve: (id: number) => Promise<Mistake>;
  };
  revisions: {
    create: (data: any) => Promise<Revision>;
    getDue: () => Promise<Revision[]>;
    getByTopic: (topicId: number) => Promise<Revision[]>;
    getAll: (filters?: any) => Promise<Revision[]>;
    update: (id: number, data: any) => Promise<Revision>;
    delete: (id: number) => Promise<void>;
    getSchedule: () => Promise<Revision[]>;
  };
  mocks: {
    create: (data: any) => Promise<MockTest>;
    getAll: () => Promise<MockTest[]>;
    getById: (id: number) => Promise<MockTest>;
    update: (id: number, data: any) => Promise<MockTest>;
    delete: (id: number) => Promise<void>;
  };
  goals: {
    create: (data: any) => Promise<Goal>;
    getAll: () => Promise<Goal[]>;
    getActive: () => Promise<Goal[]>;
    update: (id: number, data: any) => Promise<Goal>;
    delete: (id: number) => Promise<void>;
  };
  phases: {
    create: (data: any) => Promise<Phase>;
    getAll: () => Promise<Phase[]>;
    getById: (id: number) => Promise<Phase>;
    update: (id: number, data: any) => Promise<Phase>;
    delete: (id: number) => Promise<void>;
  };
  analytics: {
    getDashboard: () => Promise<DashboardData>;
    getStudyAnalytics: (range?: any) => Promise<any>;
    getQuestionAnalytics: (range?: any) => Promise<any>;
    getWeakAreas: () => Promise<any[]>;
    getRecommendations: () => Promise<Recommendation[]>;
    getHeatmap: (year: number) => Promise<any[]>;
    getSubjectStats: (subjectId: number) => Promise<any>;
    getTopicStats: (topicId: number) => Promise<any>;
  };
  events: {
    getAll: () => Promise<CalendarEvent[]>;
    getByDateRange: (range: { startDate: string; endDate: string }) => Promise<CalendarEvent[]>;
    create: (data: Partial<CalendarEvent>) => Promise<CalendarEvent>;
    update: (id: number, data: Partial<CalendarEvent>) => Promise<CalendarEvent>;
    delete: (id: number) => Promise<{ success: boolean }>;
    getExamInfo: () => Promise<ExamInfo>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    getAll: () => Promise<Record<string, string>>;
  };
  backup: {
    create: () => Promise<any>;
    restore: () => Promise<any>;
    exportData: (format: string) => Promise<any>;
    importData: () => Promise<any>;
    getAll: () => Promise<any[]>;
    getDbInfo: () => Promise<any>;
  };
  search: {
    global: (query: string) => Promise<any>;
  };
  setup: {
    isFirstRun: () => Promise<boolean>;
    complete: (data: any) => Promise<void>;
  };
  privacy: {
    get: (userId?: string) => Promise<Omit<PrivacySettings, 'user_id' | 'updated_at'> | null>;
    set: (settings: Partial<PrivacySettings>, userId?: string) => Promise<void>;
  };
  power: {
    onSuspend: (callback: () => void) => () => void;
    onResume: (callback: (durationSeconds: number) => void) => () => void;
  };
  onForceSaveSession: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
