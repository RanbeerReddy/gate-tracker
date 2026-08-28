import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { log } from '../utils/logger';

export function getActiveGatePaper(db: any, explicitPaper?: string): string {
  if (explicitPaper && explicitPaper !== 'ALL') return explicitPaper;
  try {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'gate_paper'").get() as any;
    if (setting?.value) return setting.value;
  } catch (_) {}
  return 'CS';
}

export function registerSubjectHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('subjects:getAll', (_e, paper?: string) => {
    const activePaper = getActiveGatePaper(db, paper);
    if (paper === 'ALL') {
      return db.prepare(`
        SELECT s.*, 
          (SELECT COUNT(*) FROM topics WHERE subject_id = s.id) as topic_count,
          (SELECT COUNT(*) FROM topics WHERE subject_id = s.id AND status = 'completed') as completed_topics,
          (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions WHERE subject_id = s.id AND is_active = 0) as total_study_seconds,
          (SELECT COUNT(*) FROM questions WHERE subject_id = s.id) as total_questions,
          (SELECT COUNT(*) FROM questions WHERE subject_id = s.id AND is_correct = 1) as correct_questions
        FROM subjects s 
        WHERE s.is_archived = 0 
        ORDER BY s.display_order, s.id
      `).all();
    }
    return db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM topics WHERE subject_id = s.id) as topic_count,
        (SELECT COUNT(*) FROM topics WHERE subject_id = s.id AND status = 'completed') as completed_topics,
        (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions WHERE subject_id = s.id AND is_active = 0) as total_study_seconds,
        (SELECT COUNT(*) FROM questions WHERE subject_id = s.id) as total_questions,
        (SELECT COUNT(*) FROM questions WHERE subject_id = s.id AND is_correct = 1) as correct_questions
      FROM subjects s 
      WHERE s.is_archived = 0 AND (s.gate_paper = ? OR s.gate_paper = 'SHARED' OR s.gate_paper = 'ALL')
      ORDER BY s.display_order, s.id
    `).all(activePaper);
  });

  ipcMain.handle('subjects:getById', (_e, id: number) => {
    return db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM topics WHERE subject_id = s.id) as topic_count,
        (SELECT COUNT(*) FROM topics WHERE subject_id = s.id AND status = 'completed') as completed_topics,
        (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions WHERE subject_id = s.id AND is_active = 0) as total_study_seconds,
        (SELECT COUNT(*) FROM questions WHERE subject_id = s.id) as total_questions,
        (SELECT COUNT(*) FROM questions WHERE subject_id = s.id AND is_correct = 1) as correct_questions
      FROM subjects s WHERE s.id = ?
    `).get(id);
  });

  ipcMain.handle('subjects:create', (_e, data: any) => {
    const activePaper = data.gate_paper || getActiveGatePaper(db);
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM subjects').get() as any;
    const result = db.prepare(
      'INSERT INTO subjects (name, color, display_order, gate_paper) VALUES (?, ?, ?, ?)'
    ).run(data.name, data.color || '#3B82F6', (maxOrder?.max_order || 0) + 1, activePaper);
    return db.prepare('SELECT * FROM subjects WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('subjects:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.color !== undefined) { sets.push('color = ?'); values.push(data.color); }
    if (data.gate_paper !== undefined) { sets.push('gate_paper = ?'); values.push(data.gate_paper); }
    if (data.is_archived !== undefined) { sets.push('is_archived = ?'); values.push(data.is_archived ? 1 : 0); }
    sets.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE subjects SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
  });

  ipcMain.handle('subjects:delete', (_e, id: number) => {
    db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  });

  ipcMain.handle('subjects:reorder', (_e, ids: number[]) => {
    const updateOrder = db.prepare('UPDATE subjects SET display_order = ? WHERE id = ?');
    const reorder = db.transaction(() => {
      ids.forEach((id, index) => updateOrder.run(index, id));
    });
    reorder();
  });

  // Topics
  ipcMain.handle('topics:getBySubject', (_e, subjectId: number) => {
    return db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM subtopics WHERE topic_id = t.id) as subtopic_count,
        (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions WHERE topic_id = t.id AND is_active = 0) as total_study_seconds,
        (SELECT COUNT(*) FROM questions WHERE topic_id = t.id) as total_questions,
        (SELECT COUNT(*) FROM questions WHERE topic_id = t.id AND is_correct = 1) as correct_questions,
        (SELECT MAX(revision_date) FROM revisions WHERE topic_id = t.id) as last_revision,
        (SELECT MIN(next_revision_date) FROM revisions WHERE topic_id = t.id AND next_revision_date >= date('now')) as next_revision,
        (SELECT COUNT(*) FROM revisions WHERE topic_id = t.id) as revision_count
      FROM topics t 
      WHERE t.subject_id = ? 
      ORDER BY t.display_order, t.id
    `).all(subjectId);
  });

  ipcMain.handle('topics:getById', (_e, id: number) => {
    return db.prepare(`
      SELECT t.*, s.name as subject_name, s.color as subject_color,
        (SELECT COUNT(*) FROM subtopics WHERE topic_id = t.id) as subtopic_count,
        (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions WHERE topic_id = t.id AND is_active = 0) as total_study_seconds,
        (SELECT COUNT(*) FROM questions WHERE topic_id = t.id) as total_questions,
        (SELECT COUNT(*) FROM questions WHERE topic_id = t.id AND is_correct = 1) as correct_questions,
        (SELECT MAX(revision_date) FROM revisions WHERE topic_id = t.id) as last_revision,
        (SELECT MIN(next_revision_date) FROM revisions WHERE topic_id = t.id AND next_revision_date >= date('now')) as next_revision,
        (SELECT COUNT(*) FROM revisions WHERE topic_id = t.id) as revision_count,
        (SELECT COUNT(*) FROM mistakes WHERE topic_id = t.id AND is_resolved = 0) as unresolved_mistakes
      FROM topics t
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE t.id = ?
    `).get(id);
  });

  ipcMain.handle('topics:create', (_e, data: any) => {
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM topics WHERE subject_id = ?').get(data.subject_id) as any;
    const result = db.prepare(
      'INSERT INTO topics (subject_id, name, display_order) VALUES (?, ?, ?)'
    ).run(data.subject_id, data.name, (maxOrder?.max_order || 0) + 1);
    return db.prepare('SELECT * FROM topics WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('topics:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }
    if (data.confidence !== undefined) { sets.push('confidence = ?'); values.push(data.confidence); }
    if (data.notes !== undefined) { sets.push('notes = ?'); values.push(data.notes); }
    sets.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE topics SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM topics WHERE id = ?').get(id);
  });

  ipcMain.handle('topics:delete', (_e, id: number) => {
    db.prepare('DELETE FROM topics WHERE id = ?').run(id);
  });

  ipcMain.handle('topics:updateStatus', (_e, id: number, status: string) => {
    db.prepare("UPDATE topics SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return db.prepare('SELECT * FROM topics WHERE id = ?').get(id);
  });

  // Subtopics
  ipcMain.handle('subtopics:getByTopic', (_e, topicId: number) => {
    return db.prepare('SELECT * FROM subtopics WHERE topic_id = ? ORDER BY display_order, id').all(topicId);
  });

  ipcMain.handle('subtopics:create', (_e, data: any) => {
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM subtopics WHERE topic_id = ?').get(data.topic_id) as any;
    const result = db.prepare(
      'INSERT INTO subtopics (topic_id, name, display_order) VALUES (?, ?, ?)'
    ).run(data.topic_id, data.name, (maxOrder?.max_order || 0) + 1);
    return db.prepare('SELECT * FROM subtopics WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('subtopics:update', (_e, id: number, data: any) => {
    db.prepare('UPDATE subtopics SET name = ? WHERE id = ?').run(data.name, id);
    return db.prepare('SELECT * FROM subtopics WHERE id = ?').get(id);
  });

  ipcMain.handle('subtopics:delete', (_e, id: number) => {
    db.prepare('DELETE FROM subtopics WHERE id = ?').run(id);
  });
}
