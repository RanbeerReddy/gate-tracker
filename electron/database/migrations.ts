import { getDatabase } from './connection';
import { log } from '../utils/logger';

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      -- Subjects
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#3B82F6',
        display_order INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Topics
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'not_started',
        confidence INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Subtopics
      CREATE TABLE IF NOT EXISTS subtopics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Study Sessions
      CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER REFERENCES subjects(id),
        topic_id INTEGER REFERENCES topics(id),
        subtopic_id INTEGER REFERENCES subtopics(id),
        activity_type TEXT NOT NULL DEFAULT 'learning',
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        pause_duration_seconds INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        questions_solved INTEGER DEFAULT 0,
        focus_rating INTEGER,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Planned Sessions
      CREATE TABLE IF NOT EXISTS planned_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        subject_id INTEGER REFERENCES subjects(id),
        topic_id INTEGER REFERENCES topics(id),
        subtopic_id INTEGER REFERENCES subtopics(id),
        activity_type TEXT NOT NULL DEFAULT 'learning',
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        notes TEXT,
        is_completed INTEGER NOT NULL DEFAULT 0,
        linked_session_id INTEGER REFERENCES study_sessions(id),
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Questions
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,
        year INTEGER,
        subject_id INTEGER REFERENCES subjects(id),
        topic_id INTEGER REFERENCES topics(id),
        subtopic_id INTEGER REFERENCES subtopics(id),
        difficulty TEXT DEFAULT 'medium',
        question_type TEXT DEFAULT 'mcq',
        is_correct INTEGER,
        time_seconds INTEGER,
        confidence TEXT DEFAULT 'medium',
        is_pyq INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Mistakes
      CREATE TABLE IF NOT EXISTS mistakes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
        subject_id INTEGER REFERENCES subjects(id),
        topic_id INTEGER REFERENCES topics(id),
        category TEXT NOT NULL DEFAULT 'other',
        explanation TEXT,
        correction TEXT,
        what_to_notice TEXT,
        is_resolved INTEGER NOT NULL DEFAULT 0,
        revision_date TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Revisions
      CREATE TABLE IF NOT EXISTS revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER REFERENCES topics(id),
        subtopic_id INTEGER REFERENCES subtopics(id),
        revision_date TEXT NOT NULL,
        performance_rating INTEGER,
        confidence INTEGER,
        notes TEXT,
        next_revision_date TEXT,
        revision_number INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Mock Tests
      CREATE TABLE IF NOT EXISTS mock_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        test_name TEXT NOT NULL,
        total_marks REAL NOT NULL DEFAULT 100,
        score REAL NOT NULL DEFAULT 0,
        attempted INTEGER NOT NULL DEFAULT 0,
        correct INTEGER NOT NULL DEFAULT 0,
        wrong INTEGER NOT NULL DEFAULT 0,
        unattempted INTEGER NOT NULL DEFAULT 0,
        negative_marks REAL NOT NULL DEFAULT 0,
        time_minutes INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Mock Test Sections
      CREATE TABLE IF NOT EXISTS mock_test_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mock_test_id INTEGER NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id),
        marks_obtained REAL NOT NULL DEFAULT 0,
        total_marks REAL NOT NULL DEFAULT 0,
        correct INTEGER NOT NULL DEFAULT 0,
        wrong INTEGER NOT NULL DEFAULT 0,
        attempted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Goals
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL DEFAULT 'daily',
        metric TEXT NOT NULL DEFAULT 'study_hours',
        target_value REAL NOT NULL,
        current_value REAL NOT NULL DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Phases
      CREATE TABLE IF NOT EXISTS phases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Phase Subjects
      CREATE TABLE IF NOT EXISTS phase_subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        target_completion REAL NOT NULL DEFAULT 100,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Settings
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Backups log
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        size_bytes INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Active Session (for crash recovery, single row)
      CREATE TABLE IF NOT EXISTS active_session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        session_data TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
      CREATE INDEX IF NOT EXISTS idx_subtopics_topic ON subtopics(topic_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_subject ON study_sessions(subject_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_topic ON study_sessions(topic_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_start ON study_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_sessions_active ON study_sessions(is_active);
      CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
      CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
      CREATE INDEX IF NOT EXISTS idx_questions_pyq ON questions(is_pyq);
      CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at);
      CREATE INDEX IF NOT EXISTS idx_mistakes_subject ON mistakes(subject_id);
      CREATE INDEX IF NOT EXISTS idx_mistakes_resolved ON mistakes(is_resolved);
      CREATE INDEX IF NOT EXISTS idx_revisions_topic ON revisions(topic_id);
      CREATE INDEX IF NOT EXISTS idx_revisions_date ON revisions(revision_date);
      CREATE INDEX IF NOT EXISTS idx_revisions_next ON revisions(next_revision_date);
      CREATE INDEX IF NOT EXISTS idx_planned_date ON planned_sessions(date);
      CREATE INDEX IF NOT EXISTS idx_mocks_date ON mock_tests(date);
      CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
      CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(is_active);

      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT DEFAULT (datetime('now'))
      );
    `,
  },
  {
    version: 2,
    name: 'calendar_events_and_exam_settings',
    up: `
      -- Calendar & Exam Events
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        event_date TEXT NOT NULL,
        end_date TEXT,
        color TEXT NOT NULL DEFAULT '#EF4444',
        event_type TEXT NOT NULL DEFAULT 'exam',
        description TEXT,
        is_exam INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_events_date ON calendar_events(event_date);
      CREATE INDEX IF NOT EXISTS idx_events_exam ON calendar_events(is_exam);

      -- Seed default GATE CSE 2027 event
      INSERT OR IGNORE INTO calendar_events (name, event_date, color, event_type, description, is_exam)
      VALUES ('GATE CSE 2027', '2027-02-07', '#EF4444', 'exam', 'Official GATE CSE Exam Date', 1);

      -- Seed default settings for exam date
      INSERT OR IGNORE INTO settings (key, value) VALUES ('gate_exam_date', '2027-02-07');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('gate_exam_name', 'GATE CSE 2027');
    `,
  },
  {
    version: 3,
    name: 'local_privacy_settings',
    up: `
      -- Local privacy settings cache so checkboxes persist across restarts
      -- even without a network connection to fetch from Supabase
      CREATE TABLE IF NOT EXISTS privacy_settings_local (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        share_profile INTEGER NOT NULL DEFAULT 0,
        share_calendar INTEGER NOT NULL DEFAULT 0,
        share_study_hours INTEGER NOT NULL DEFAULT 0,
        share_question_stats INTEGER NOT NULL DEFAULT 0,
        share_syllabus_progress INTEGER NOT NULL DEFAULT 0,
        share_mock_performance INTEGER NOT NULL DEFAULT 0,
        share_subject_progress INTEGER NOT NULL DEFAULT 0,
        visibility TEXT NOT NULL DEFAULT 'public',
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Insert default row
      INSERT OR IGNORE INTO privacy_settings_local (id) VALUES (1);
    `,
  },
];

export function runMigrations(): void {
  const db = getDatabase();
  
  // Ensure schema_version table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
  
  const currentVersion = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as any;
  const current = currentVersion?.version || 0;
  
  log(`Current schema version: ${current}`);
  
  const pendingMigrations = MIGRATIONS.filter(m => m.version > current);
  
  if (pendingMigrations.length === 0) {
    log('No pending migrations.');
    return;
  }
  
  for (const migration of pendingMigrations) {
    log(`Applying migration ${migration.version}: ${migration.name}`);
    
    const runMigration = db.transaction(() => {
      // Split and execute each statement separately
      const statements = migration.up.split(';').filter(s => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          db.exec(stmt + ';');
        }
      }
      
      db.prepare('INSERT INTO schema_version (version, name) VALUES (?, ?)').run(
        migration.version,
        migration.name
      );
    });
    
    try {
      runMigration();
      log(`Migration ${migration.version} applied successfully.`);
    } catch (err) {
      log(`Migration ${migration.version} failed`, err);
      throw err;
    }
  }
}
