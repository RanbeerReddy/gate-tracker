import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { log } from '../utils/logger';

export function registerSessionHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('sessions:start', (_e, data: any) => {
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO study_sessions (subject_id, topic_id, subtopic_id, activity_type, start_time, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(data.subject_id, data.topic_id || null, data.subtopic_id || null, data.activity_type || 'learning', now);
    
    const session = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(result.lastInsertRowid);
    
    // Save active state for crash recovery
    db.prepare("UPDATE active_session SET session_data = ?, updated_at = datetime('now') WHERE id = 1").run(
      JSON.stringify({ sessionId: result.lastInsertRowid, isActive: true, startTime: now })
    );
    
    log(`Study session started: ${result.lastInsertRowid}`);
    return session;
  });

  ipcMain.handle('sessions:pause', (_e, id: number) => {
    // Pausing just saves the current state - the renderer tracks pause timing
    log(`Study session paused: ${id}`);
    return db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id);
  });

  ipcMain.handle('sessions:resume', (_e, id: number) => {
    log(`Study session resumed: ${id}`);
    return db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id);
  });

  ipcMain.handle('sessions:finish', (_e, id: number, data: any) => {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE study_sessions 
      SET end_time = ?, duration_seconds = ?, pause_duration_seconds = ?,
          notes = ?, questions_solved = ?, focus_rating = ?, is_active = 0
      WHERE id = ?
    `).run(
      now,
      data.duration_seconds || 0,
      data.pause_duration_seconds || 0,
      data.notes || null,
      data.questions_solved || 0,
      data.focus_rating || null,
      id
    );
    
    // Clear active state
    db.prepare("UPDATE active_session SET session_data = NULL, updated_at = datetime('now') WHERE id = 1").run();
    
    log(`Study session finished: ${id}, duration: ${data.duration_seconds}s`);
    return db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id);
  });

  ipcMain.handle('sessions:getActive', () => {
    return db.prepare('SELECT * FROM study_sessions WHERE is_active = 1 LIMIT 1').get() || null;
  });

  ipcMain.handle('sessions:getAll', (_e, filters: any = {}) => {
    let where = 'WHERE ss.is_active = 0';
    const params: any[] = [];
    
    if (filters.subject_id) {
      where += ' AND ss.subject_id = ?';
      params.push(filters.subject_id);
    }
    if (filters.topic_id) {
      where += ' AND ss.topic_id = ?';
      params.push(filters.topic_id);
    }
    if (filters.activity_type) {
      where += ' AND ss.activity_type = ?';
      params.push(filters.activity_type);
    }
    if (filters.date_from) {
      where += ' AND ss.start_time >= ?';
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      where += ' AND ss.start_time <= ?';
      params.push(filters.date_to);
    }
    
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    
    return db.prepare(`
      SELECT ss.*, 
        s.name as subject_name, s.color as subject_color,
        t.name as topic_name,
        st.name as subtopic_name
      FROM study_sessions ss
      LEFT JOIN subjects s ON ss.subject_id = s.id
      LEFT JOIN topics t ON ss.topic_id = t.id
      LEFT JOIN subtopics st ON ss.subtopic_id = st.id
      ${where}
      ORDER BY ss.start_time DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
  });

  ipcMain.handle('sessions:getById', (_e, id: number) => {
    return db.prepare(`
      SELECT ss.*, 
        s.name as subject_name, s.color as subject_color,
        t.name as topic_name,
        st.name as subtopic_name
      FROM study_sessions ss
      LEFT JOIN subjects s ON ss.subject_id = s.id
      LEFT JOIN topics t ON ss.topic_id = t.id
      LEFT JOIN subtopics st ON ss.subtopic_id = st.id
      WHERE ss.id = ?
    `).get(id);
  });

  ipcMain.handle('sessions:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    
    const fields = ['subject_id', 'topic_id', 'subtopic_id', 'activity_type', 'start_time', 'end_time',
      'duration_seconds', 'pause_duration_seconds', 'notes', 'questions_solved', 'focus_rating'];
    
    for (const field of fields) {
      if (data[field] !== undefined) {
        sets.push(`${field} = ?`);
        values.push(data[field]);
      }
    }
    
    if (sets.length === 0) return db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id);
    
    values.push(id);
    db.prepare(`UPDATE study_sessions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id);
  });

  ipcMain.handle('sessions:delete', (_e, id: number) => {
    db.prepare('DELETE FROM study_sessions WHERE id = ?').run(id);
  });

  ipcMain.handle('sessions:saveActiveState', (_e, data: any) => {
    db.prepare("UPDATE active_session SET session_data = ?, updated_at = datetime('now') WHERE id = 1").run(
      JSON.stringify(data)
    );
  });

  ipcMain.handle('sessions:getActiveState', () => {
    const row = db.prepare('SELECT session_data FROM active_session WHERE id = 1').get() as any;
    if (row?.session_data) {
      try { return JSON.parse(row.session_data); } catch { return null; }
    }
    return null;
  });

  ipcMain.handle('sessions:clearActiveState', () => {
    db.prepare("UPDATE active_session SET session_data = NULL, updated_at = datetime('now') WHERE id = 1").run();
  });
}
