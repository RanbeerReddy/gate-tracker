import fs from 'fs';
import path from 'path';
import { getDatabase, closeDatabase, initDatabase } from './connection';
import { getBackupPath, getAppDataPath } from '../utils/paths';
import { log } from '../utils/logger';

export function createBackup(): { filename: string; filepath: string; size: number } {
  const db = getDatabase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `gate-tracker-backup-${timestamp}.db`;
  const filepath = path.join(getBackupPath(), filename);
  
  try {
    // WAL checkpoint before backup to guarantee all WAL transactions are flushed to disk
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (_) {}

    db.backup(filepath);
    const stats = fs.statSync(filepath);
    
    // Log backup in database
    db.prepare('INSERT INTO backups (filename, filepath, size_bytes) VALUES (?, ?, ?)').run(
      filename, filepath, stats.size
    );
    
    log(`Backup created: ${filepath} (${stats.size} bytes)`);
    
    // Auto-cleanup: keep only last 10 backups
    cleanupOldBackups(10);
    
    return { filename, filepath, size: stats.size };
  } catch (err) {
    log('Backup failed', err);
    throw new Error('Failed to create backup. Please try again.');
  }
}

export function restoreBackup(filepath: string): void {
  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file not found.');
  }
  
  const dbPath = path.join(getAppDataPath(), 'gate-tracker.db');
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  try {
    // 1. Create a safety backup before restoring
    try {
      createBackup();
    } catch (e) {
      log('Pre-restore safety backup creation warning', e);
    }
    
    // 2. Safely close current SQLite connection
    closeDatabase();

    // 3. Remove stale WAL and SHM files to prevent corruption
    if (fs.existsSync(walPath)) {
      try { fs.unlinkSync(walPath); } catch (_) {}
    }
    if (fs.existsSync(shmPath)) {
      try { fs.unlinkSync(shmPath); } catch (_) {}
    }

    // 4. Overwrite current database with backup file
    fs.copyFileSync(filepath, dbPath);
    
    // 5. Re-initialize database connection
    initDatabase(dbPath);

    log(`Backup successfully restored from: ${filepath}`);
  } catch (err) {
    log('Restore failed', err);
    // Ensure database connection is re-opened even if failed
    try { initDatabase(dbPath); } catch (_) {}
    throw new Error('Failed to restore backup. Your current data is safe.');
  }
}

export function exportData(format: 'json' | 'csv', exportPath: string): void {
  const db = getDatabase();
  
  try {
    if (format === 'json') {
      const data: Record<string, any> = {};
      const tables = [
        'subjects',
        'topics',
        'subtopics',
        'study_sessions',
        'planned_sessions',
        'questions',
        'mistakes',
        'revisions',
        'mock_tests',
        'mock_test_sections',
        'goals',
        'phases',
        'phase_subjects',
        'calendar_events',
        'settings',
      ];
      
      for (const table of tables) {
        try {
          data[table] = db.prepare(`SELECT * FROM ${table}`).all();
        } catch (_) {
          data[table] = [];
        }
      }
      
      data.export_date = new Date().toISOString();
      data.version = '1.0.0';
      data.app = 'GATE Tracker';
      
      fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
      log(`Data exported as JSON to: ${exportPath}`);
    } else if (format === 'csv') {
      // Export key tables as CSV
      const tables = ['study_sessions', 'questions', 'mistakes', 'mock_tests'];
      
      for (const table of tables) {
        const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, any>[];
        if (rows.length === 0) continue;
        
        const headers = Object.keys(rows[0]);
        const csvContent = [
          headers.join(','),
          ...rows.map(row => headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"` : str;
          }).join(','))
        ].join('\n');
        
        const csvPath = exportPath.replace(/\.[^.]+$/, '') + `_${table}.csv`;
        fs.writeFileSync(csvPath, csvContent);
      }
      
      log(`Data exported as CSV to: ${exportPath}`);
    }
  } catch (err) {
    log('Export failed', err);
    throw new Error('Failed to export data. Please try again.');
  }
}

/**
 * Full JSON Entity Import
 * Restores all exported entities (study sessions, questions, mistakes, revisions,
 * mocks, goals, planner, and settings) inside an atomic transaction.
 */
export function importData(filepath: string): { importedCounts: Record<string, number> } {
  if (!fs.existsSync(filepath)) {
    throw new Error('Import file not found.');
  }
  
  const db = getDatabase();
  const counts: Record<string, number> = {};
  
  try {
    // 1. Create a safety backup before importing
    createBackup();
    
    const content = fs.readFileSync(filepath, 'utf-8');
    const data = JSON.parse(content);
    
    if (!data.version || !data.export_date) {
      throw new Error('Invalid GATE Tracker backup format.');
    }

    const importTransaction = db.transaction(() => {
      // Temporarily disable foreign keys during bulk import to preserve cross-table relations
      db.pragma('foreign_keys = OFF');

      // 1. Import Settings
      if (Array.isArray(data.settings)) {
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
        let c = 0;
        for (const s of data.settings) {
          if (s.key) {
            stmt.run(s.key, s.value);
            c++;
          }
        }
        counts.settings = c;
      }

      // 2. Import Subjects
      if (Array.isArray(data.subjects) && data.subjects.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO subjects (id, name, color, display_order, is_archived, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const s of data.subjects) {
          stmt.run(s.id, s.name, s.color || '#3B82F6', s.display_order || 0, s.is_archived || 0, s.created_at, s.updated_at);
          c++;
        }
        counts.subjects = c;
      }

      // 3. Import Topics
      if (Array.isArray(data.topics) && data.topics.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO topics (id, subject_id, name, display_order, status, confidence, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const t of data.topics) {
          stmt.run(t.id, t.subject_id, t.name, t.display_order || 0, t.status || 'not_started', t.confidence || 0, t.notes || null, t.created_at, t.updated_at);
          c++;
        }
        counts.topics = c;
      }

      // 4. Import Subtopics
      if (Array.isArray(data.subtopics) && data.subtopics.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO subtopics (id, topic_id, name, display_order, created_at)
          VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const st of data.subtopics) {
          stmt.run(st.id, st.topic_id, st.name, st.display_order || 0, st.created_at);
          c++;
        }
        counts.subtopics = c;
      }

      // 5. Import Study Sessions
      if (Array.isArray(data.study_sessions) && data.study_sessions.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO study_sessions (id, subject_id, topic_id, subtopic_id, activity_type, start_time, end_time, duration_seconds, pause_duration_seconds, notes, questions_solved, focus_rating, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const ss of data.study_sessions) {
          stmt.run(
            ss.id, ss.subject_id, ss.topic_id, ss.subtopic_id,
            ss.activity_type || 'learning', ss.start_time, ss.end_time,
            ss.duration_seconds || 0, ss.pause_duration_seconds || 0,
            ss.notes || null, ss.questions_solved || 0, ss.focus_rating || null,
            ss.is_active || 0, ss.created_at
          );
          c++;
        }
        counts.study_sessions = c;
      }

      // 6. Import Questions
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO questions (id, source, year, subject_id, topic_id, subtopic_id, difficulty, question_type, is_correct, time_seconds, confidence, is_pyq, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const q of data.questions) {
          stmt.run(
            q.id, q.source || null, q.year || null, q.subject_id || null,
            q.topic_id || null, q.subtopic_id || null, q.difficulty || 'medium',
            q.question_type || 'mcq', q.is_correct !== undefined ? q.is_correct : null,
            q.time_seconds || null, q.confidence || 'medium', q.is_pyq || 0,
            q.notes || null, q.created_at
          );
          c++;
        }
        counts.questions = c;
      }

      // 7. Import Mistakes
      if (Array.isArray(data.mistakes) && data.mistakes.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO mistakes (id, question_id, subject_id, topic_id, category, explanation, correction, what_to_notice, is_resolved, revision_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const m of data.mistakes) {
          stmt.run(
            m.id, m.question_id || null, m.subject_id || null, m.topic_id || null,
            m.category || 'other', m.explanation || null, m.correction || null,
            m.what_to_notice || null, m.is_resolved || 0, m.revision_date || null,
            m.created_at
          );
          c++;
        }
        counts.mistakes = c;
      }

      // 8. Import Revisions
      if (Array.isArray(data.revisions) && data.revisions.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO revisions (id, topic_id, subtopic_id, revision_date, performance_rating, confidence, notes, next_revision_date, revision_number, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const r of data.revisions) {
          stmt.run(
            r.id, r.topic_id, r.subtopic_id || null, r.revision_date,
            r.performance_rating || null, r.confidence || null, r.notes || null,
            r.next_revision_date || null, r.revision_number || 1, r.created_at
          );
          c++;
        }
        counts.revisions = c;
      }

      // 9. Import Mock Tests
      if (Array.isArray(data.mock_tests) && data.mock_tests.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO mock_tests (id, date, test_name, total_marks, score, attempted, correct, wrong, unattempted, negative_marks, time_minutes, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const mt of data.mock_tests) {
          stmt.run(
            mt.id, mt.date, mt.test_name, mt.total_marks || 100, mt.score || 0,
            mt.attempted || 0, mt.correct || 0, mt.wrong || 0, mt.unattempted || 0,
            mt.negative_marks || 0, mt.time_minutes || null, mt.notes || null,
            mt.created_at
          );
          c++;
        }
        counts.mock_tests = c;
      }

      // 10. Import Goals
      if (Array.isArray(data.goals) && data.goals.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO goals (id, type, metric, target_value, current_value, start_date, end_date, is_active, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const g of data.goals) {
          stmt.run(
            g.id, g.type, g.metric, g.target_value, g.current_value || 0,
            g.start_date || null, g.end_date || null, g.is_active || 1,
            g.notes || null, g.created_at
          );
          c++;
        }
        counts.goals = c;
      }

      // 11. Import Planned Sessions
      if (Array.isArray(data.planned_sessions) && data.planned_sessions.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO planned_sessions (id, date, subject_id, topic_id, subtopic_id, activity_type, start_time, end_time, notes, is_completed, linked_session_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const ps of data.planned_sessions) {
          stmt.run(
            ps.id, ps.date, ps.subject_id, ps.topic_id || null, ps.subtopic_id || null,
            ps.activity_type || 'learning', ps.start_time, ps.end_time,
            ps.notes || null, ps.is_completed || 0, ps.linked_session_id || null,
            ps.created_at
          );
          c++;
        }
        counts.planned_sessions = c;
      }

      // 12. Import Calendar Events
      if (Array.isArray(data.calendar_events) && data.calendar_events.length > 0) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO calendar_events (id, name, event_date, end_date, color, event_type, description, is_exam, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
        `);
        let c = 0;
        for (const ce of data.calendar_events) {
          stmt.run(
            ce.id, ce.name, ce.event_date, ce.end_date || null,
            ce.color || '#EF4444', ce.event_type || 'custom', ce.description || null,
            ce.is_exam || 0, ce.is_active || 1, ce.created_at
          );
          c++;
        }
        counts.calendar_events = c;
      }

      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    });

    importTransaction();
    log(`Full JSON import complete from: ${filepath}`, counts);
    return { importedCounts: counts };
  } catch (err: any) {
    log('Import failed', err);
    throw new Error(`Failed to import data: ${err.message}`);
  }
}

export function getBackupList(): any[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
}

export function getDatabaseInfo(): { size: string; path: string; tables: number; sessions: number; questions: number } {
  const db = getDatabase();
  const dbPath = path.join(getAppDataPath(), 'gate-tracker.db');
  
  let size = '0 KB';
  try {
    const stats = fs.statSync(dbPath);
    size = stats.size < 1024 * 1024
      ? `${(stats.size / 1024).toFixed(1)} KB`
      : `${(stats.size / (1024 * 1024)).toFixed(1)} MB`;
  } catch {}
  
  const tables = (db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get() as any).count;
  const sessions = (db.prepare('SELECT COUNT(*) as count FROM study_sessions').get() as any).count;
  const questions = (db.prepare('SELECT COUNT(*) as count FROM questions').get() as any).count;
  
  return { size, path: dbPath, tables, sessions, questions };
}

function cleanupOldBackups(keepCount: number): void {
  const db = getDatabase();
  const backups = db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all() as any[];
  
  if (backups.length <= keepCount) return;
  
  const toDelete = backups.slice(keepCount);
  for (const backup of toDelete) {
    try {
      if (fs.existsSync(backup.filepath)) {
        fs.unlinkSync(backup.filepath);
      }
      db.prepare('DELETE FROM backups WHERE id = ?').run(backup.id);
    } catch (err) {
      log(`Failed to cleanup backup: ${backup.filename}`, err);
    }
  }
}
