import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';

export function registerMockHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('mocks:create', (_e, data: any) => {
    const result = db.prepare(`
      INSERT INTO mock_tests (date, test_name, total_marks, score, attempted, correct, wrong, unattempted, negative_marks, time_minutes, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.date, data.test_name, data.total_marks || 100,
      data.score || 0, data.attempted || 0, data.correct || 0,
      data.wrong || 0, data.unattempted || 0, data.negative_marks || 0,
      data.time_minutes || null, data.notes || null
    );
    
    const mockId = result.lastInsertRowid as number;
    
    // Insert sections if provided
    if (data.sections && Array.isArray(data.sections)) {
      const insertSection = db.prepare(`
        INSERT INTO mock_test_sections (mock_test_id, subject_id, marks_obtained, total_marks, correct, wrong, attempted)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const section of data.sections) {
        insertSection.run(mockId, section.subject_id, section.marks_obtained || 0,
          section.total_marks || 0, section.correct || 0, section.wrong || 0, section.attempted || 0);
      }
    }
    
    return db.prepare('SELECT * FROM mock_tests WHERE id = ?').get(mockId);
  });

  ipcMain.handle('mocks:getAll', () => {
    return db.prepare('SELECT * FROM mock_tests ORDER BY date DESC').all();
  });

  ipcMain.handle('mocks:getById', (_e, id: number) => {
    const mock = db.prepare('SELECT * FROM mock_tests WHERE id = ?').get(id);
    const sections = db.prepare(`
      SELECT mts.*, s.name as subject_name, s.color as subject_color
      FROM mock_test_sections mts
      LEFT JOIN subjects s ON mts.subject_id = s.id
      WHERE mts.mock_test_id = ?
    `).all(id);
    return { ...(mock as any), sections };
  });

  ipcMain.handle('mocks:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    const fields = ['date', 'test_name', 'total_marks', 'score', 'attempted', 'correct',
      'wrong', 'unattempted', 'negative_marks', 'time_minutes', 'notes'];
    
    for (const field of fields) {
      if (data[field] !== undefined) { sets.push(`${field} = ?`); values.push(data[field]); }
    }
    if (sets.length > 0) {
      values.push(id);
      db.prepare(`UPDATE mock_tests SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    
    // Update sections
    if (data.sections && Array.isArray(data.sections)) {
      db.prepare('DELETE FROM mock_test_sections WHERE mock_test_id = ?').run(id);
      const insertSection = db.prepare(`
        INSERT INTO mock_test_sections (mock_test_id, subject_id, marks_obtained, total_marks, correct, wrong, attempted)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const section of data.sections) {
        insertSection.run(id, section.subject_id, section.marks_obtained || 0,
          section.total_marks || 0, section.correct || 0, section.wrong || 0, section.attempted || 0);
      }
    }
    
    return db.prepare('SELECT * FROM mock_tests WHERE id = ?').get(id);
  });

  ipcMain.handle('mocks:delete', (_e, id: number) => {
    db.prepare('DELETE FROM mock_tests WHERE id = ?').run(id);
  });
}
