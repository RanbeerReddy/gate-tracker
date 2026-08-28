import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { log } from '../utils/logger';
import { calculateDaysRemaining } from '../utils/dates';

export function registerEventHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('events:getAll', () => {
    return db.prepare(`
      SELECT * FROM calendar_events 
      WHERE is_active = 1 
      ORDER BY event_date ASC
    `).all();
  });

  ipcMain.handle('events:getByDateRange', (_e, { startDate, endDate }: { startDate: string; endDate: string }) => {
    return db.prepare(`
      SELECT * FROM calendar_events 
      WHERE is_active = 1 
        AND event_date >= ? 
        AND event_date <= ?
      ORDER BY event_date ASC
    `).all(startDate, endDate);
  });

  ipcMain.handle('events:create', (_e, data: {
    name: string;
    event_date: string;
    end_date?: string | null;
    color?: string;
    event_type?: string;
    description?: string | null;
    is_exam?: boolean;
  }) => {
    const result = db.prepare(`
      INSERT INTO calendar_events (name, event_date, end_date, color, event_type, description, is_exam)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.event_date,
      data.end_date || null,
      data.color || '#EF4444',
      data.event_type || 'custom',
      data.description || null,
      data.is_exam ? 1 : 0
    );

    // If marked as exam, sync to settings
    if (data.is_exam) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('gate_exam_date', ?, datetime('now'))").run(data.event_date);
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('gate_exam_name', ?, datetime('now'))").run(data.name);
    }

    log(`Event created: ${result.lastInsertRowid}`);
    return db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('events:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    const fields = ['name', 'event_date', 'end_date', 'color', 'event_type', 'description', 'is_exam', 'is_active'];

    for (const field of fields) {
      if (data[field] !== undefined) {
        sets.push(`${field} = ?`);
        values.push(field === 'is_exam' || field === 'is_active' ? (data[field] ? 1 : 0) : data[field]);
      }
    }

    if (sets.length > 0) {
      values.push(id);
      db.prepare(`UPDATE calendar_events SET ${sets.join(', ')} WHERE id = ?`).run(...values);

      if (data.is_exam && data.event_date) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('gate_exam_date', ?, datetime('now'))").run(data.event_date);
        if (data.name) {
          db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('gate_exam_name', ?, datetime('now'))").run(data.name);
        }
      }
    }

    return db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
  });

  ipcMain.handle('events:delete', (_e, id: number) => {
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
    log(`Event deleted: ${id}`);
    return { success: true };
  });

  ipcMain.handle('events:getExamInfo', (_e, paper?: string) => {
    const examEvent = db.prepare(`
      SELECT * FROM calendar_events 
      WHERE is_exam = 1 AND is_active = 1 
      ORDER BY event_date ASC LIMIT 1
    `).get() as any;

    const activePaper = paper || (db.prepare("SELECT value FROM settings WHERE key = 'gate_paper'").get() as any)?.value || 'CS';
    const dateSetting = db.prepare("SELECT value FROM settings WHERE key = 'gate_exam_date'").get() as any;
    const nameSetting = db.prepare("SELECT value FROM settings WHERE key = 'gate_exam_name'").get() as any;

    const defaultExamName = activePaper === 'EC' ? 'GATE EC 2027' : 'GATE CS 2027';
    const examDate = examEvent?.event_date || dateSetting?.value || '2027-02-07';
    let examName = examEvent?.name || nameSetting?.value || defaultExamName;

    // Calculate days remaining without UTC drift
    const { daysRemaining, isPast } = calculateDaysRemaining(examDate);

    return {
      examDate,
      examName,
      daysRemaining,
      isPast,
      event: examEvent || null,
    };
  });
}
