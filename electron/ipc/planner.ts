import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';

export function registerPlannerHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('planner:getByDate', (_e, date: string) => {
    return db.prepare(`
      SELECT ps.*, 
        s.name as subject_name, s.color as subject_color,
        t.name as topic_name, st.name as subtopic_name
      FROM planned_sessions ps
      LEFT JOIN subjects s ON ps.subject_id = s.id
      LEFT JOIN topics t ON ps.topic_id = t.id
      LEFT JOIN subtopics st ON ps.subtopic_id = st.id
      WHERE ps.date = ?
      ORDER BY ps.start_time ASC
    `).all(date);
  });

  ipcMain.handle('planner:create', (_e, data: any) => {
    const result = db.prepare(`
      INSERT INTO planned_sessions (date, subject_id, topic_id, subtopic_id, activity_type, start_time, end_time, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.date, data.subject_id, data.topic_id || null, data.subtopic_id || null,
      data.activity_type || 'learning', data.start_time, data.end_time, data.notes || null);
    return db.prepare('SELECT * FROM planned_sessions WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('planner:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    const fields = ['date', 'subject_id', 'topic_id', 'subtopic_id', 'activity_type',
      'start_time', 'end_time', 'notes', 'is_completed', 'linked_session_id'];
    for (const field of fields) {
      if (data[field] !== undefined) { sets.push(`${field} = ?`); values.push(data[field]); }
    }
    if (sets.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE planned_sessions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM planned_sessions WHERE id = ?').get(id);
  });

  ipcMain.handle('planner:delete', (_e, id: number) => {
    db.prepare('DELETE FROM planned_sessions WHERE id = ?').run(id);
  });

  ipcMain.handle('planner:markCompleted', (_e, id: number, sessionId: number) => {
    db.prepare('UPDATE planned_sessions SET is_completed = 1, linked_session_id = ? WHERE id = ?').run(sessionId, id);
  });
}
