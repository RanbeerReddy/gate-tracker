import { ipcMain, dialog } from 'electron';
import { getDatabase } from '../database/connection';
import { createBackup, restoreBackup, exportData, importData, getBackupList, getDatabaseInfo } from '../database/backup';
import { log } from '../utils/logger';

export function registerSettingsHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('settings:get', (_e, key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row?.value || null;
  });

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(key, value);
  });

  ipcMain.handle('settings:getAll', () => {
    const rows = db.prepare('SELECT * FROM settings').all() as any[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  });

  // Backup
  ipcMain.handle('backup:create', () => {
    try {
      return createBackup();
    } catch (err: any) {
      log('Backup creation failed', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('backup:restore', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Restore Backup',
        filters: [{ name: 'Database Backup', extensions: ['db'] }],
        properties: ['openFile'],
      });
      
      if (result.canceled || !result.filePaths[0]) return { canceled: true };
      
      restoreBackup(result.filePaths[0]);
      return { success: true, message: 'Backup restored. Please restart the application.' };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('backup:export', async (_e, format: string) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Data',
        defaultPath: `gate-tracker-export-${new Date().toISOString().slice(0, 10)}.${format}`,
        filters: format === 'json'
          ? [{ name: 'JSON Files', extensions: ['json'] }]
          : [{ name: 'CSV Files', extensions: ['csv'] }],
      });
      
      if (result.canceled || !result.filePath) return { canceled: true };
      
      exportData(format as 'json' | 'csv', result.filePath);
      return { success: true, path: result.filePath };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('backup:import', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Data',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile'],
      });
      
      if (result.canceled || !result.filePaths[0]) return { canceled: true };
      
      importData(result.filePaths[0]);
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('backup:getAll', () => {
    return getBackupList();
  });

  ipcMain.handle('backup:getDbInfo', () => {
    return getDatabaseInfo();
  });

  // Setup
  ipcMain.handle('setup:isFirstRun', () => {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'first_run_complete'").get() as any;
    return !setting || setting.value !== 'true';
  });

  ipcMain.handle('setup:complete', (_e, data: any) => {
    const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
    
    db.transaction(() => {
      if (data.target_gate_year) upsert.run('target_gate_year', data.target_gate_year);
      if (data.target_score) upsert.run('target_score', data.target_score);
      if (data.target_rank) upsert.run('target_rank', data.target_rank);
      if (data.daily_study_target_hours) upsert.run('daily_study_target_hours', data.daily_study_target_hours);
      if (data.theme) upsert.run('theme', data.theme);
      upsert.run('first_run_complete', 'true');
    })();
    
    log('First-run setup completed.');
  });

  // Privacy Settings (local SQLite cache, scoped per user)
  ipcMain.handle('privacy:get', (_e, userId?: string) => {
    try {
      const targetUserId = userId || 'local';
      let row = db.prepare('SELECT * FROM user_privacy_cache WHERE user_id = ?').get(targetUserId) as any;
      if (!row && targetUserId !== 'local') {
        // Fallback to local row if specific user hasn't set one yet
        row = db.prepare('SELECT * FROM user_privacy_cache WHERE user_id = ?').get('local') as any;
      }
      if (!row) {
        // Check old table if present
        try {
          row = db.prepare('SELECT * FROM privacy_settings_local WHERE id = 1').get() as any;
        } catch (_) {}
      }
      if (!row) return null;
      return {
        share_profile: !!row.share_profile,
        share_calendar: !!row.share_calendar,
        share_study_hours: !!row.share_study_hours,
        share_question_stats: !!row.share_question_stats,
        share_syllabus_progress: !!row.share_syllabus_progress,
        share_mock_performance: !!row.share_mock_performance,
        share_subject_progress: !!row.share_subject_progress,
        visibility: row.visibility || 'public',
      };
    } catch (err) {
      log('Error reading local privacy settings', err);
      return null;
    }
  });

  ipcMain.handle('privacy:set', (_e, { userId, settings }: { userId?: string; settings: any } | any) => {
    try {
      // Support both { userId, settings } and direct settings object
      const actualSettings = settings?.share_profile !== undefined ? settings : (userId?.share_profile !== undefined ? userId : settings);
      const targetUserId = (typeof userId === 'string' && userId.length > 0) ? userId : 'local';

      db.prepare(`
        INSERT OR REPLACE INTO user_privacy_cache 
        (user_id, share_profile, share_calendar, share_study_hours, share_question_stats,
         share_syllabus_progress, share_mock_performance, share_subject_progress,
         visibility, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        targetUserId,
        actualSettings.share_profile ? 1 : 0,
        actualSettings.share_calendar ? 1 : 0,
        actualSettings.share_study_hours ? 1 : 0,
        actualSettings.share_question_stats ? 1 : 0,
        actualSettings.share_syllabus_progress ? 1 : 0,
        actualSettings.share_mock_performance ? 1 : 0,
        actualSettings.share_subject_progress ? 1 : 0,
        actualSettings.visibility || 'public',
      );
    } catch (err) {
      log('Error saving local privacy settings', err);
    }
  });
}
