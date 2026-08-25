import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';

export function registerMistakeHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('mistakes:create', (_e, data: any) => {
    const result = db.prepare(`
      INSERT INTO mistakes (question_id, subject_id, topic_id, category, explanation, correction, what_to_notice, revision_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.question_id || null, data.subject_id || null, data.topic_id || null,
      data.category || 'other', data.explanation || null,
      data.correction || null, data.what_to_notice || null, data.revision_date || null
    );
    return db.prepare('SELECT * FROM mistakes WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('mistakes:getAll', (_e, filters: any = {}) => {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    
    if (filters.subject_id) { where += ' AND m.subject_id = ?'; params.push(filters.subject_id); }
    if (filters.topic_id) { where += ' AND m.topic_id = ?'; params.push(filters.topic_id); }
    if (filters.category) { where += ' AND m.category = ?'; params.push(filters.category); }
    if (filters.is_resolved !== undefined) { where += ' AND m.is_resolved = ?'; params.push(filters.is_resolved ? 1 : 0); }
    
    const limit = filters.limit || 200;
    const offset = filters.offset || 0;
    
    return db.prepare(`
      SELECT m.*, 
        s.name as subject_name, s.color as subject_color,
        t.name as topic_name
      FROM mistakes m
      LEFT JOIN subjects s ON m.subject_id = s.id
      LEFT JOIN topics t ON m.topic_id = t.id
      ${where}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
  });

  ipcMain.handle('mistakes:getById', (_e, id: number) => {
    return db.prepare(`
      SELECT m.*, s.name as subject_name, t.name as topic_name
      FROM mistakes m
      LEFT JOIN subjects s ON m.subject_id = s.id
      LEFT JOIN topics t ON m.topic_id = t.id
      WHERE m.id = ?
    `).get(id);
  });

  ipcMain.handle('mistakes:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    const fields = ['question_id', 'subject_id', 'topic_id', 'category', 'explanation',
      'correction', 'what_to_notice', 'is_resolved', 'revision_date'];
    
    for (const field of fields) {
      if (data[field] !== undefined) {
        sets.push(`${field} = ?`);
        values.push(field === 'is_resolved' ? (data[field] ? 1 : 0) : data[field]);
      }
    }
    if (sets.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE mistakes SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM mistakes WHERE id = ?').get(id);
  });

  ipcMain.handle('mistakes:delete', (_e, id: number) => {
    db.prepare('DELETE FROM mistakes WHERE id = ?').run(id);
  });

  ipcMain.handle('mistakes:resolve', (_e, id: number) => {
    db.prepare('UPDATE mistakes SET is_resolved = 1 WHERE id = ?').run(id);
    return db.prepare('SELECT * FROM mistakes WHERE id = ?').get(id);
  });
}
