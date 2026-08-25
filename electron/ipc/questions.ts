import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';

export function registerQuestionHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('questions:create', (_e, data: any) => {
    const result = db.prepare(`
      INSERT INTO questions (source, year, subject_id, topic_id, subtopic_id, difficulty, question_type, is_correct, time_seconds, confidence, is_pyq, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.source || null, data.year || null, data.subject_id || null,
      data.topic_id || null, data.subtopic_id || null,
      data.difficulty || 'medium', data.question_type || 'mcq',
      data.is_correct !== undefined ? (data.is_correct ? 1 : 0) : null,
      data.time_seconds || null, data.confidence || 'medium',
      data.is_pyq ? 1 : 0, data.notes || null
    );
    return db.prepare('SELECT * FROM questions WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('questions:getAll', (_e, filters: any = {}) => {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    
    if (filters.subject_id) { where += ' AND q.subject_id = ?'; params.push(filters.subject_id); }
    if (filters.topic_id) { where += ' AND q.topic_id = ?'; params.push(filters.topic_id); }
    if (filters.is_pyq !== undefined) { where += ' AND q.is_pyq = ?'; params.push(filters.is_pyq ? 1 : 0); }
    if (filters.is_correct !== undefined) { where += ' AND q.is_correct = ?'; params.push(filters.is_correct ? 1 : 0); }
    if (filters.difficulty) { where += ' AND q.difficulty = ?'; params.push(filters.difficulty); }
    if (filters.year) { where += ' AND q.year = ?'; params.push(filters.year); }
    if (filters.date_from) { where += ' AND q.created_at >= ?'; params.push(filters.date_from); }
    if (filters.date_to) { where += ' AND q.created_at <= ?'; params.push(filters.date_to); }
    
    const limit = filters.limit || 200;
    const offset = filters.offset || 0;
    
    return db.prepare(`
      SELECT q.*, 
        s.name as subject_name, s.color as subject_color,
        t.name as topic_name,
        st.name as subtopic_name
      FROM questions q
      LEFT JOIN subjects s ON q.subject_id = s.id
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subtopics st ON q.subtopic_id = st.id
      ${where}
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
  });

  ipcMain.handle('questions:getById', (_e, id: number) => {
    return db.prepare(`
      SELECT q.*, s.name as subject_name, t.name as topic_name, st.name as subtopic_name
      FROM questions q
      LEFT JOIN subjects s ON q.subject_id = s.id
      LEFT JOIN topics t ON q.topic_id = t.id
      LEFT JOIN subtopics st ON q.subtopic_id = st.id
      WHERE q.id = ?
    `).get(id);
  });

  ipcMain.handle('questions:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    const fields = ['source', 'year', 'subject_id', 'topic_id', 'subtopic_id', 'difficulty',
      'question_type', 'is_correct', 'time_seconds', 'confidence', 'is_pyq', 'notes'];
    
    for (const field of fields) {
      if (data[field] !== undefined) {
        sets.push(`${field} = ?`);
        if (field === 'is_correct' || field === 'is_pyq') {
          values.push(data[field] ? 1 : 0);
        } else {
          values.push(data[field]);
        }
      }
    }
    if (sets.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE questions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  });

  ipcMain.handle('questions:delete', (_e, id: number) => {
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  });

  ipcMain.handle('questions:bulkCreate', (_e, dataArr: any[]) => {
    const insert = db.prepare(`
      INSERT INTO questions (source, year, subject_id, topic_id, subtopic_id, difficulty, question_type, is_correct, time_seconds, confidence, is_pyq, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertAll = db.transaction((items: any[]) => {
      for (const data of items) {
        insert.run(
          data.source || null, data.year || null, data.subject_id || null,
          data.topic_id || null, data.subtopic_id || null,
          data.difficulty || 'medium', data.question_type || 'mcq',
          data.is_correct !== undefined ? (data.is_correct ? 1 : 0) : null,
          data.time_seconds || null, data.confidence || 'medium',
          data.is_pyq ? 1 : 0, data.notes || null
        );
      }
    });
    
    insertAll(dataArr);
    return { inserted: dataArr.length };
  });
}
