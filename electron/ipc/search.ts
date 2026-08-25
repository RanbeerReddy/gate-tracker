import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';

export function registerSearchHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('search:global', (_e, query: string) => {
    if (!query || query.trim().length < 2) return { subjects: [], topics: [], sessions: [], questions: [], mistakes: [], mocks: [] };
    
    const searchTerm = `%${query.trim()}%`;
    
    const subjects = db.prepare(`
      SELECT id, name, color, 'subject' as type FROM subjects WHERE name LIKE ? AND is_archived = 0 LIMIT 10
    `).all(searchTerm);

    const topics = db.prepare(`
      SELECT t.id, t.name, s.name as subject_name, s.color, 'topic' as type
      FROM topics t JOIN subjects s ON t.subject_id = s.id
      WHERE t.name LIKE ? AND s.is_archived = 0 LIMIT 10
    `).all(searchTerm);

    const sessions = db.prepare(`
      SELECT ss.id, ss.start_time, ss.activity_type, ss.duration_seconds,
        s.name as subject_name, s.color, t.name as topic_name, 'session' as type
      FROM study_sessions ss
      LEFT JOIN subjects s ON ss.subject_id = s.id
      LEFT JOIN topics t ON ss.topic_id = t.id
      WHERE (ss.notes LIKE ? OR s.name LIKE ? OR t.name LIKE ?) AND ss.is_active = 0
      ORDER BY ss.start_time DESC LIMIT 10
    `).all(searchTerm, searchTerm, searchTerm);

    const questions = db.prepare(`
      SELECT q.id, q.source, q.year, q.is_correct, q.difficulty,
        s.name as subject_name, s.color, t.name as topic_name, 'question' as type
      FROM questions q
      LEFT JOIN subjects s ON q.subject_id = s.id
      LEFT JOIN topics t ON q.topic_id = t.id
      WHERE q.notes LIKE ? OR q.source LIKE ? OR s.name LIKE ? OR t.name LIKE ?
      ORDER BY q.created_at DESC LIMIT 10
    `).all(searchTerm, searchTerm, searchTerm, searchTerm);

    const mistakes = db.prepare(`
      SELECT m.id, m.category, m.explanation, m.is_resolved,
        s.name as subject_name, s.color, t.name as topic_name, 'mistake' as type
      FROM mistakes m
      LEFT JOIN subjects s ON m.subject_id = s.id
      LEFT JOIN topics t ON m.topic_id = t.id
      WHERE m.explanation LIKE ? OR m.correction LIKE ? OR m.what_to_notice LIKE ?
        OR s.name LIKE ? OR t.name LIKE ?
      ORDER BY m.created_at DESC LIMIT 10
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

    const mocks = db.prepare(`
      SELECT id, test_name, date, score, total_marks, 'mock' as type
      FROM mock_tests WHERE test_name LIKE ? OR notes LIKE ?
      ORDER BY date DESC LIMIT 10
    `).all(searchTerm, searchTerm);

    return { subjects, topics, sessions, questions, mistakes, mocks };
  });
}
