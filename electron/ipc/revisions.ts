import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { formatLocalDate } from '../utils/dates';
import { getActiveGatePaper } from './subjects';

export function registerRevisionHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('revisions:create', (_e, data: any) => {
    // Get current revision count for this topic
    const existing = db.prepare(
      'SELECT COUNT(*) as count FROM revisions WHERE topic_id = ?'
    ).get(data.topic_id) as any;
    const revisionNumber = (existing?.count || 0) + 1;
    
    // Calculate next revision date based on spaced repetition
    const intervals = getRevisionIntervals();
    const nextIntervalDays = intervals[Math.min(revisionNumber, intervals.length - 1)];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextIntervalDays);
    
    // Adjust based on performance - poor performance = sooner revision
    let adjustedNextDate = nextDate;
    if (data.performance_rating && data.performance_rating <= 2) {
      adjustedNextDate = new Date();
      adjustedNextDate.setDate(adjustedNextDate.getDate() + 1); // Review again tomorrow
    } else if (data.performance_rating === 3) {
      adjustedNextDate = new Date();
      adjustedNextDate.setDate(adjustedNextDate.getDate() + Math.ceil(nextIntervalDays / 2));
    }
    
    const result = db.prepare(`
      INSERT INTO revisions (topic_id, subtopic_id, revision_date, performance_rating, confidence, notes, next_revision_date, revision_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.topic_id, data.subtopic_id || null,
      data.revision_date || formatLocalDate(new Date()),
      data.performance_rating || null, data.confidence || null,
      data.notes || null, formatLocalDate(adjustedNextDate),
      revisionNumber
    );
    
    // Update topic status
    if (data.confidence && data.confidence >= 80) {
      db.prepare("UPDATE topics SET status = 'strong', confidence = ?, updated_at = datetime('now') WHERE id = ?")
        .run(data.confidence, data.topic_id);
    } else if (data.performance_rating && data.performance_rating <= 2) {
      db.prepare("UPDATE topics SET status = 'needs_revision', confidence = ?, updated_at = datetime('now') WHERE id = ?")
        .run(data.confidence || 0, data.topic_id);
    }
    
    return db.prepare('SELECT * FROM revisions WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('revisions:getDue', (_e, paper?: string) => {
    const activePaper = getActiveGatePaper(db, paper);
    return db.prepare(`
      SELECT r.*, t.name as topic_name, s.name as subject_name, s.color as subject_color,
        t.status as topic_status
      FROM revisions r
      LEFT JOIN topics t ON r.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE r.next_revision_date <= date('now')
        AND r.id IN (
          SELECT MAX(id) FROM revisions GROUP BY topic_id
        )
        AND (s.id IS NULL OR s.gate_paper = ? OR s.gate_paper = 'SHARED' OR s.gate_paper = 'ALL')
      ORDER BY r.next_revision_date ASC
    `).all(activePaper);
  });

  ipcMain.handle('revisions:getByTopic', (_e, topicId: number) => {
    return db.prepare(`
      SELECT * FROM revisions WHERE topic_id = ? ORDER BY revision_date DESC
    `).all(topicId);
  });

  ipcMain.handle('revisions:getAll', (_e, filters: any = {}) => {
    const activePaper = getActiveGatePaper(db, filters.gate_paper || filters.paper);
    let where = 'WHERE 1=1';
    const params: any[] = [];
    
    if (filters.paper !== 'ALL' && filters.gate_paper !== 'ALL') {
      where += ` AND (s.id IS NULL OR s.gate_paper = ? OR s.gate_paper = 'SHARED' OR s.gate_paper = 'ALL')`;
      params.push(activePaper);
    }
    
    if (filters.topic_id) { where += ' AND r.topic_id = ?'; params.push(filters.topic_id); }
    if (filters.date_from) { where += ' AND r.revision_date >= ?'; params.push(filters.date_from); }
    if (filters.date_to) { where += ' AND r.revision_date <= ?'; params.push(filters.date_to); }
    
    return db.prepare(`
      SELECT r.*, t.name as topic_name, s.name as subject_name, s.color as subject_color
      FROM revisions r
      LEFT JOIN topics t ON r.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      ${where}
      ORDER BY r.revision_date DESC
      LIMIT 200
    `).all(...params);
  });

  ipcMain.handle('revisions:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    const fields = ['performance_rating', 'confidence', 'notes', 'next_revision_date'];
    for (const field of fields) {
      if (data[field] !== undefined) { sets.push(`${field} = ?`); values.push(data[field]); }
    }
    if (sets.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE revisions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM revisions WHERE id = ?').get(id);
  });

  ipcMain.handle('revisions:delete', (_e, id: number) => {
    db.prepare('DELETE FROM revisions WHERE id = ?').run(id);
  });

  ipcMain.handle('revisions:getSchedule', (_e, paper?: string) => {
    const activePaper = getActiveGatePaper(db, paper);
    // Get the latest revision for each topic and show upcoming schedule
    return db.prepare(`
      SELECT r.*, t.name as topic_name, s.name as subject_name, s.color as subject_color,
        t.status as topic_status, t.confidence as topic_confidence
      FROM revisions r
      INNER JOIN (
        SELECT topic_id, MAX(id) as max_id FROM revisions GROUP BY topic_id
      ) latest ON r.id = latest.max_id
      LEFT JOIN topics t ON r.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE s.is_archived = 0 AND (s.gate_paper = ? OR s.gate_paper = 'SHARED' OR s.gate_paper = 'ALL')
      ORDER BY r.next_revision_date ASC
      LIMIT 50
    `).all(activePaper);
  });
}

function getRevisionIntervals(): number[] {
  const db = getDatabase();
  try {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'revision_intervals'").get() as any;
    if (setting?.value) {
      return setting.value.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n));
    }
  } catch {}
  return [1, 3, 7, 14, 30]; // Default intervals
}
