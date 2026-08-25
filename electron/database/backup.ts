import fs from 'fs';
import path from 'path';
import { getDatabase } from './connection';
import { getBackupPath, getAppDataPath } from '../utils/paths';
import { log } from '../utils/logger';

export function createBackup(): { filename: string; filepath: string; size: number } {
  const db = getDatabase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `gate-tracker-backup-${timestamp}.db`;
  const filepath = path.join(getBackupPath(), filename);
  
  try {
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
  
  try {
    // Create a safety backup before restoring
    createBackup();
    
    const dbPath = path.join(getAppDataPath(), 'gate-tracker.db');
    
    // Close current database connection is handled by the caller
    // Copy the backup over the current database
    fs.copyFileSync(filepath, dbPath);
    
    log(`Backup restored from: ${filepath}`);
  } catch (err) {
    log('Restore failed', err);
    throw new Error('Failed to restore backup. Your current data is safe.');
  }
}

export function exportData(format: 'json' | 'csv', exportPath: string): void {
  const db = getDatabase();
  
  try {
    if (format === 'json') {
      const data: Record<string, any> = {};
      const tables = ['subjects', 'topics', 'subtopics', 'study_sessions', 'planned_sessions',
        'questions', 'mistakes', 'revisions', 'mock_tests', 'mock_test_sections',
        'goals', 'phases', 'phase_subjects', 'settings'];
      
      for (const table of tables) {
        data[table] = db.prepare(`SELECT * FROM ${table}`).all();
      }
      
      data.export_date = new Date().toISOString();
      data.version = '1.0.0';
      
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

export function importData(filepath: string): void {
  if (!fs.existsSync(filepath)) {
    throw new Error('Import file not found.');
  }
  
  const db = getDatabase();
  
  try {
    // Create backup before import
    createBackup();
    
    const content = fs.readFileSync(filepath, 'utf-8');
    const data = JSON.parse(content);
    
    if (!data.version) {
      throw new Error('Invalid import file format.');
    }
    
    const importTransaction = db.transaction(() => {
      // Import settings
      if (data.settings) {
        const upsertSetting = db.prepare(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))'
        );
        for (const setting of data.settings) {
          upsertSetting.run(setting.key, setting.value);
        }
      }
      
      log('Data imported. Note: Only settings were merged. For full restore, use backup restore.');
    });
    
    importTransaction();
    log(`Data imported from: ${filepath}`);
  } catch (err) {
    log('Import failed', err);
    throw new Error('Failed to import data. Your current data is safe.');
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
