import Database from 'better-sqlite3';
import { log } from '../utils/logger';

let db: Database.Database | null = null;

export function initDatabase(dbPath: string): void {
  try {
    db = new Database(dbPath);
    
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    
    log(`Database initialized at: ${dbPath}`);
  } catch (err) {
    log('Failed to initialize database', err);
    throw err;
  }
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
      log('Database closed');
    } catch (err) {
      log('Error closing database', err);
    }
    db = null;
  }
}
