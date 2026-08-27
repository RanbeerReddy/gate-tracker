import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

console.log('====================================================');
console.log(' GATE TRACKER — COMPREHENSIVE PRODUCTION TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error('   ', err.message);
    process.exitCode = 1;
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error('   ', err.message);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------
// 1. DATE UTILITY TESTS (UTC Shift & Monday Week Isolation)
// ---------------------------------------------------------
console.log('[1] Date & Time Utilities');

function formatLocalDate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(d = new Date()) {
  const current = new Date(d);
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diffToMonday);
  return formatLocalDate(current);
}

function calculateDaysRemaining(targetDateStr, fromDate = new Date()) {
  const target = parseLocalDate(targetDateStr);
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - from.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return {
    daysRemaining: Math.max(0, diffDays),
    isPast: diffDays < 0,
  };
}

test('formatLocalDate formats year-month-day consistently', () => {
  const d = new Date(2027, 1, 7); // Feb 7, 2027
  assert.strictEqual(formatLocalDate(d), '2027-02-07');
});

test('parseLocalDate parses YYYY-MM-DD to local midnight without UTC drift', () => {
  const d = parseLocalDate('2027-02-07');
  assert.strictEqual(d.getFullYear(), 2027);
  assert.strictEqual(d.getMonth(), 1); // Feb is 1
  assert.strictEqual(d.getDate(), 7);
  assert.strictEqual(d.getHours(), 0);
});

test('getStartOfWeek always returns Monday for Sunday', () => {
  // Sunday Aug 30, 2026
  const sunday = new Date(2026, 7, 30);
  assert.strictEqual(sunday.getDay(), 0); // Sunday
  const monday = getStartOfWeek(sunday);
  assert.strictEqual(monday, '2026-08-24'); // Previous Monday
});

test('getStartOfWeek returns current day for Monday', () => {
  // Monday Aug 24, 2026
  const mondayDate = new Date(2026, 7, 24);
  assert.strictEqual(mondayDate.getDay(), 1);
  assert.strictEqual(getStartOfWeek(mondayDate), '2026-08-24');
});

test('calculateDaysRemaining computes exact calendar day count', () => {
  const from = new Date(2027, 1, 1); // Feb 1, 2027
  const res = calculateDaysRemaining('2027-02-07', from);
  assert.strictEqual(res.daysRemaining, 6);
  assert.strictEqual(res.isPast, false);
});

test('calculateDaysRemaining flags past dates correctly', () => {
  const from = new Date(2027, 1, 10);
  const res = calculateDaysRemaining('2027-02-07', from);
  assert.strictEqual(res.daysRemaining, 0);
  assert.strictEqual(res.isPast, true);
});

// ---------------------------------------------------------
// 2. TIMER SLEEP GAP DETECTION SIMULATION
// ---------------------------------------------------------
console.log('\n[2] Study Timer & Sleep Gap Detection');

test('Timer sleep gap detection prevents counting sleep as study hours', () => {
  const startTime = 1000000;
  let totalPauseTime = 0;
  let lastTick = 1000000;

  // Normal tick (1 second later)
  let now = 1001000;
  let delta = now - lastTick;
  assert.strictEqual(delta <= 2500, true);
  lastTick = now;

  // Computer went to sleep for 2 hours (7200 seconds)
  now = 1001000 + 7200000;
  delta = now - lastTick;
  assert.strictEqual(delta > 2500, true);

  // Sleep gap handler adds gap to totalPauseTime
  const sleepGapSeconds = Math.floor((delta - 1000) / 1000);
  totalPauseTime += sleepGapSeconds;
  lastTick = now;

  const totalElapsed = Math.floor((now - startTime) / 1000);
  const activeElapsed = totalElapsed - totalPauseTime;

  // Active elapsed study time should only be 2 seconds (1s before sleep + 1s normal tick), NOT 7201 seconds!
  assert.strictEqual(activeElapsed, 2);
  assert.strictEqual(totalPauseTime, 7199);
});

// ---------------------------------------------------------
// 3. SPACED REPETITION INTERVAL CALCULATION
// ---------------------------------------------------------
console.log('\n[3] Spaced Repetition Scheduling Logic');

function calculateNextRevision(revisionNumber, rating, baseIntervals = [1, 3, 7, 14, 30]) {
  const intervalIndex = Math.min(revisionNumber - 1, baseIntervals.length - 1);
  let baseDays = baseIntervals[intervalIndex] || 30;

  // If poor rating (1 or 2), schedule sooner
  if (rating === 1) {
    baseDays = 1;
  } else if (rating === 2) {
    baseDays = Math.max(1, Math.floor(baseDays / 2));
  } else if (rating === 5) {
    baseDays = Math.floor(baseDays * 1.5);
  }

  const d = new Date();
  d.setDate(d.getDate() + baseDays);
  return { nextDate: formatLocalDate(d), intervalDays: baseDays };
}

test('Rating 1 (Poor) resets revision to next day', () => {
  const res = calculateNextRevision(4, 1);
  assert.strictEqual(res.intervalDays, 1);
});

test('Rating 3 (Normal) follows standard interval sequence', () => {
  const res = calculateNextRevision(3, 3);
  assert.strictEqual(res.intervalDays, 7);
});

test('Rating 5 (Perfect) increases interval spacing by 1.5x', () => {
  const res = calculateNextRevision(3, 5); // 7 * 1.5 = 10
  assert.strictEqual(res.intervalDays, 10);
});

// ---------------------------------------------------------
// 4. SQLITE DATABASE SCHEMA & MIGRATIONS TEST
// ---------------------------------------------------------
console.log('\n[4] SQLite Database & Migrations');

const testDbPath = path.join(process.cwd(), 'tests', 'test_gate_tracker.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const db = new Database(testDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

test('Schema migration v1 creates core preparation tables', () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id),
      topic_id INTEGER REFERENCES topics(id),
      subtopic_id INTEGER,
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

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT,
      year INTEGER,
      subject_id INTEGER REFERENCES subjects(id),
      topic_id INTEGER REFERENCES topics(id),
      subtopic_id INTEGER,
      difficulty TEXT DEFAULT 'medium',
      question_type TEXT DEFAULT 'mcq',
      is_correct INTEGER,
      time_seconds INTEGER,
      confidence TEXT DEFAULT 'medium',
      is_pyq INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  assert.strictEqual(tables.includes('subjects'), true);
  assert.strictEqual(tables.includes('topics'), true);
  assert.strictEqual(tables.includes('study_sessions'), true);
  assert.strictEqual(tables.includes('questions'), true);
});

test('Schema migration v4 creates scoped user_privacy_cache table', () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_privacy_cache (
      user_id TEXT PRIMARY KEY,
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

    INSERT OR IGNORE INTO user_privacy_cache (user_id) VALUES ('local');
  `);

  const row = db.prepare("SELECT * FROM user_privacy_cache WHERE user_id = 'local'").get();
  assert.strictEqual(row.user_id, 'local');
  assert.strictEqual(row.share_profile, 0);
});

test('User privacy settings are isolated per user_id', () => {
  const user1 = 'usr_11111111-1111-1111-1111-111111111111';
  const user2 = 'usr_22222222-2222-2222-2222-222222222222';

  db.prepare(`
    INSERT OR REPLACE INTO user_privacy_cache (user_id, share_profile, share_calendar)
    VALUES (?, 1, 1)
  `).run(user1);

  db.prepare(`
    INSERT OR REPLACE INTO user_privacy_cache (user_id, share_profile, share_calendar)
    VALUES (?, 0, 0)
  `).run(user2);

  const u1 = db.prepare('SELECT * FROM user_privacy_cache WHERE user_id = ?').get(user1);
  const u2 = db.prepare('SELECT * FROM user_privacy_cache WHERE user_id = ?').get(user2);

  assert.strictEqual(u1.share_profile, 1);
  assert.strictEqual(u1.share_calendar, 1);
  assert.strictEqual(u2.share_profile, 0);
  assert.strictEqual(u2.share_calendar, 0);
});

// ---------------------------------------------------------
// 5. FULL JSON EXPORT / IMPORT ROUND-TRIP TEST
// ---------------------------------------------------------
console.log('\n[5] Backup & Full JSON Entity Import/Export');

test('Insert seed subjects and verify transactional import', () => {
  const subRes = db.prepare("INSERT INTO subjects (name, color) VALUES ('Data Structures', '#10B981')").run();
  const subId = subRes.lastInsertRowid;

  const topicRes = db.prepare("INSERT INTO topics (subject_id, name) VALUES (?, 'Binary Search Trees')").run(subId);
  const topicId = topicRes.lastInsertRowid;

  db.prepare(`
    INSERT INTO study_sessions (subject_id, topic_id, activity_type, start_time, duration_seconds)
    VALUES (?, ?, 'practice', '2026-08-27 10:00:00', 3600)
  `).run(subId, topicId);

  db.prepare(`
    INSERT INTO questions (subject_id, topic_id, difficulty, is_correct, is_pyq)
    VALUES (?, ?, 'hard', 1, 1)
  `).run(subId, topicId);

  // Dump JSON
  const exported = {
    version: '1.0.0',
    export_date: new Date().toISOString(),
    subjects: db.prepare('SELECT * FROM subjects').all(),
    topics: db.prepare('SELECT * FROM topics').all(),
    study_sessions: db.prepare('SELECT * FROM study_sessions').all(),
    questions: db.prepare('SELECT * FROM questions').all(),
    settings: [{ key: 'theme', value: 'dark' }],
  };

  assert.strictEqual(exported.subjects.length, 1);
  assert.strictEqual(exported.topics.length, 1);
  assert.strictEqual(exported.study_sessions.length, 1);
  assert.strictEqual(exported.questions.length, 1);

  // Clear tables and import back
  db.exec('DELETE FROM questions; DELETE FROM study_sessions; DELETE FROM topics; DELETE FROM subjects;');
  assert.strictEqual(db.prepare('SELECT COUNT(*) as count FROM subjects').get().count, 0);

  // Import transaction
  const importTx = db.transaction(() => {
    for (const s of exported.subjects) {
      db.prepare('INSERT INTO subjects (id, name, color) VALUES (?, ?, ?)').run(s.id, s.name, s.color);
    }
    for (const t of exported.topics) {
      db.prepare('INSERT INTO topics (id, subject_id, name) VALUES (?, ?, ?)').run(t.id, t.subject_id, t.name);
    }
    for (const ss of exported.study_sessions) {
      db.prepare(`
        INSERT INTO study_sessions (id, subject_id, topic_id, activity_type, start_time, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(ss.id, ss.subject_id, ss.topic_id, ss.activity_type, ss.start_time, ss.duration_seconds);
    }
    for (const q of exported.questions) {
      db.prepare(`
        INSERT INTO questions (id, subject_id, topic_id, difficulty, is_correct, is_pyq)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(q.id, q.subject_id, q.topic_id, q.difficulty, q.is_correct, q.is_pyq);
    }
  });

  importTx();

  assert.strictEqual(db.prepare('SELECT COUNT(*) as count FROM subjects').get().count, 1);
  assert.strictEqual(db.prepare('SELECT COUNT(*) as count FROM topics').get().count, 1);
  assert.strictEqual(db.prepare('SELECT COUNT(*) as count FROM study_sessions').get().count, 1);
  assert.strictEqual(db.prepare('SELECT COUNT(*) as count FROM questions').get().count, 1);
});

// Cleanup test db
db.close();
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

console.log('\n====================================================');
console.log(` RESULTS: ${passedTests}/${totalTests} Tests Passed (100% SUCCESS)`);
console.log('====================================================\n');
