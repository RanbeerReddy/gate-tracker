import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { formatLocalDate, getStartOfWeek, getStartOfMonth } from '../utils/dates';

export function registerGoalHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('goals:create', (_e, data: any) => {
    const result = db.prepare(`
      INSERT INTO goals (type, metric, target_value, start_date, end_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.type, data.metric, data.target_value,
      data.start_date || null, data.end_date || null, data.notes || null);
    return db.prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('goals:getAll', () => {
    return db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all();
  });

  ipcMain.handle('goals:getActive', () => {
    const goals = db.prepare('SELECT * FROM goals WHERE is_active = 1 ORDER BY type, metric').all() as any[];
    const today = formatLocalDate(new Date());
    const weekStart = getStartOfWeek(new Date());
    const monthStart = getStartOfMonth(new Date());
    
    // Calculate current progress for each goal
    return goals.map(goal => {
      let currentValue = 0;
      
      if (goal.type === 'daily') {
        if (goal.metric === 'study_hours') {
          const result = db.prepare(`
            SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 as hours
            FROM study_sessions WHERE date(start_time) = ? AND is_active = 0
          `).get(today) as any;
          currentValue = result.hours || 0;
        } else if (goal.metric === 'questions') {
          const result = db.prepare(`
            SELECT COUNT(*) as count FROM questions WHERE date(created_at) = ?
          `).get(today) as any;
          currentValue = result.count || 0;
        }
      } else if (goal.type === 'weekly') {
        // Standard Monday -> Sunday calendar week
        if (goal.metric === 'study_hours') {
          const result = db.prepare(`
            SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 as hours
            FROM study_sessions 
            WHERE date(start_time) >= ?
            AND is_active = 0
          `).get(weekStart) as any;
          currentValue = result.hours || 0;
        } else if (goal.metric === 'questions') {
          const result = db.prepare(`
            SELECT COUNT(*) as count FROM questions 
            WHERE date(created_at) >= ?
          `).get(weekStart) as any;
          currentValue = result.count || 0;
        }
      } else if (goal.type === 'monthly') {
        if (goal.metric === 'study_hours') {
          const result = db.prepare(`
            SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 as hours
            FROM study_sessions 
            WHERE date(start_time) >= ?
            AND is_active = 0
          `).get(monthStart) as any;
          currentValue = result.hours || 0;
        } else if (goal.metric === 'questions') {
          const result = db.prepare(`
            SELECT COUNT(*) as count FROM questions 
            WHERE date(created_at) >= ?
          `).get(monthStart) as any;
          currentValue = result.count || 0;
        }
      }
      
      return { ...goal, current_value: Math.round(currentValue * 100) / 100 };
    });
  });

  ipcMain.handle('goals:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    const fields = ['type', 'metric', 'target_value', 'start_date', 'end_date', 'is_active', 'notes'];
    for (const field of fields) {
      if (data[field] !== undefined) { sets.push(`${field} = ?`); values.push(data[field]); }
    }
    if (sets.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
  });

  ipcMain.handle('goals:delete', (_e, id: number) => {
    db.prepare('DELETE FROM goals WHERE id = ?').run(id);
  });

  // Phases
  ipcMain.handle('phases:create', (_e, data: any) => {
    const result = db.prepare(`
      INSERT INTO phases (name, start_date, end_date, notes, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.name, data.start_date, data.end_date, data.notes || null, data.is_active ? 1 : 0);
    
    const phaseId = result.lastInsertRowid as number;
    
    if (data.subjects && Array.isArray(data.subjects)) {
      const insertSubject = db.prepare(
        'INSERT INTO phase_subjects (phase_id, subject_id, target_completion) VALUES (?, ?, ?)'
      );
      for (const s of data.subjects) {
        insertSubject.run(phaseId, s.subject_id, s.target_completion || 100);
      }
    }
    
    return db.prepare('SELECT * FROM phases WHERE id = ?').get(phaseId);
  });

  ipcMain.handle('phases:getAll', () => {
    const phases = db.prepare('SELECT * FROM phases ORDER BY start_date ASC').all() as any[];
    return phases.map(phase => {
      const subjects = db.prepare(`
        SELECT ps.*, s.name as subject_name, s.color as subject_color
        FROM phase_subjects ps
        LEFT JOIN subjects s ON ps.subject_id = s.id
        WHERE ps.phase_id = ?
      `).all(phase.id);
      return { ...phase, subjects };
    });
  });

  ipcMain.handle('phases:getById', (_e, id: number) => {
    const phase = db.prepare('SELECT * FROM phases WHERE id = ?').get(id);
    if (!phase) return null;
    const subjects = db.prepare(`
      SELECT ps.*, s.name as subject_name, s.color as subject_color
      FROM phase_subjects ps LEFT JOIN subjects s ON ps.subject_id = s.id
      WHERE ps.phase_id = ?
    `).all(id);
    return { ...(phase as any), subjects };
  });

  ipcMain.handle('phases:update', (_e, id: number, data: any) => {
    const sets: string[] = [];
    const values: any[] = [];
    const fields = ['name', 'start_date', 'end_date', 'notes', 'is_active'];
    for (const field of fields) {
      if (data[field] !== undefined) { sets.push(`${field} = ?`); values.push(data[field]); }
    }
    if (sets.length > 0) {
      values.push(id);
      db.prepare(`UPDATE phases SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return db.prepare('SELECT * FROM phases WHERE id = ?').get(id);
  });

  ipcMain.handle('phases:delete', (_e, id: number) => {
    db.prepare('DELETE FROM phases WHERE id = ?').run(id);
  });
}
