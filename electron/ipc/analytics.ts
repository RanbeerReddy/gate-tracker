import { ipcMain } from 'electron';
import { getDatabase } from '../database/connection';
import { formatLocalDate, getStartOfWeek } from '../utils/dates';

export function registerAnalyticsHandlers(): void {
  const db = getDatabase();

  ipcMain.handle('analytics:getDashboard', () => {
    const today = formatLocalDate(new Date());
    const weekStart = getStartOfWeek(new Date());
    
    // Today's stats
    const todayStudy = db.prepare(`
      SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds,
        COUNT(*) as session_count,
        COALESCE(SUM(questions_solved), 0) as questions_solved
      FROM study_sessions
      WHERE date(start_time) = ? AND is_active = 0
    `).get(today) as any;

    const todayQuestions = db.prepare(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN is_correct = 1 THEN 1 END) as correct
      FROM questions WHERE date(created_at) = ?
    `).get(today) as any;

    const todaySubjects = db.prepare(`
      SELECT DISTINCT s.name, s.color
      FROM study_sessions ss
      JOIN subjects s ON ss.subject_id = s.id
      WHERE date(ss.start_time) = ? AND ss.is_active = 0
    `).all(today);

    // Current Week stats (Monday -> Sunday calendar week)
    const weekStudy = db.prepare(`
      SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds,
        COUNT(DISTINCT date(start_time)) as days_studied,
        COUNT(*) as session_count
      FROM study_sessions
      WHERE date(start_time) >= ? AND is_active = 0
    `).get(weekStart) as any;

    const weekQuestions = db.prepare(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN is_correct = 1 THEN 1 END) as correct
      FROM questions WHERE date(created_at) >= ?
    `).get(weekStart) as any;

    // Syllabus completion
    const syllabusStats = db.prepare(`
      SELECT 
        COUNT(*) as total_topics,
        COUNT(CASE WHEN status = 'completed' OR status = 'strong' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'learning' THEN 1 END) as learning,
        COUNT(CASE WHEN status = 'needs_revision' THEN 1 END) as needs_revision,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started
      FROM topics t
      JOIN subjects s ON t.subject_id = s.id
      WHERE s.is_archived = 0
    `).get() as any;

    // Subject completion
    const subjectCompletion = db.prepare(`
      SELECT s.id, s.name, s.color,
        COUNT(t.id) as total_topics,
        COUNT(CASE WHEN t.status IN ('completed', 'strong') THEN 1 END) as completed_topics,
        (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions WHERE subject_id = s.id AND is_active = 0) as total_seconds
      FROM subjects s
      LEFT JOIN topics t ON t.subject_id = s.id
      WHERE s.is_archived = 0
      GROUP BY s.id
      ORDER BY s.display_order
    `).all();

    // Recent mock scores
    const recentMocks = db.prepare(`
      SELECT date, test_name, score, total_marks,
        ROUND(CAST(correct AS REAL) / NULLIF(attempted, 0) * 100, 1) as accuracy
      FROM mock_tests ORDER BY date DESC LIMIT 5
    `).all();

    // Revision due count
    const revisionDue = db.prepare(`
      SELECT COUNT(DISTINCT r.topic_id) as count
      FROM revisions r
      INNER JOIN (SELECT topic_id, MAX(id) as max_id FROM revisions GROUP BY topic_id) latest
        ON r.id = latest.max_id
      WHERE r.next_revision_date <= date('now')
    `).get() as any;

    // Weak topics (low accuracy, recent poor performance)
    const weakTopics = db.prepare(`
      SELECT t.id, t.name as topic_name, s.name as subject_name, s.color,
        COUNT(q.id) as total_questions,
        COUNT(CASE WHEN q.is_correct = 1 THEN 1 END) as correct_questions,
        ROUND(CAST(COUNT(CASE WHEN q.is_correct = 1 THEN 1 END) AS REAL) / NULLIF(COUNT(q.id), 0) * 100, 1) as accuracy
      FROM topics t
      JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN questions q ON q.topic_id = t.id
      WHERE s.is_archived = 0
      GROUP BY t.id
      HAVING COUNT(q.id) >= 5 AND accuracy < 65
      ORDER BY accuracy ASC
      LIMIT 5
    `).all();

    return {
      today: {
        studySeconds: todayStudy.total_seconds,
        sessions: todayStudy.session_count,
        questionsSolved: todayQuestions.total,
        questionsCorrect: todayQuestions.correct,
        accuracy: todayQuestions.total > 0 ? Math.round(todayQuestions.correct / todayQuestions.total * 100) : 0,
        subjects: todaySubjects,
      },
      week: {
        studySeconds: weekStudy.total_seconds,
        daysStudied: weekStudy.days_studied,
        sessions: weekStudy.session_count,
        avgDailySeconds: weekStudy.days_studied > 0 ? Math.round(weekStudy.total_seconds / 7) : 0,
        questionsSolved: weekQuestions.total,
        questionsCorrect: weekQuestions.correct,
        accuracy: weekQuestions.total > 0 ? Math.round(weekQuestions.correct / weekQuestions.total * 100) : 0,
      },
      syllabus: syllabusStats,
      subjectCompletion,
      recentMocks,
      revisionDueCount: revisionDue.count,
      weakTopics,
    };
  });

  ipcMain.handle('analytics:getStudyAnalytics', (_e, range: any = {}) => {
    const days = range.days || 30;
    
    // Daily study hours
    const dailyStudy = db.prepare(`
      SELECT date(start_time) as date,
        SUM(duration_seconds) / 3600.0 as hours,
        COUNT(*) as sessions
      FROM study_sessions
      WHERE start_time >= datetime('now', '-${days} days') AND is_active = 0
      GROUP BY date(start_time)
      ORDER BY date ASC
    `).all();

    // Study by subject
    const bySubject = db.prepare(`
      SELECT s.name, s.color, SUM(ss.duration_seconds) / 3600.0 as hours
      FROM study_sessions ss
      JOIN subjects s ON ss.subject_id = s.id
      WHERE ss.start_time >= datetime('now', '-${days} days') AND ss.is_active = 0
      GROUP BY s.id
      ORDER BY hours DESC
    `).all();

    // Study by activity
    const byActivity = db.prepare(`
      SELECT activity_type, SUM(duration_seconds) / 3600.0 as hours, COUNT(*) as sessions
      FROM study_sessions
      WHERE start_time >= datetime('now', '-${days} days') AND is_active = 0
      GROUP BY activity_type
      ORDER BY hours DESC
    `).all();

    // Average session length
    const avgSession = db.prepare(`
      SELECT AVG(duration_seconds) / 60.0 as avg_minutes
      FROM study_sessions
      WHERE start_time >= datetime('now', '-${days} days') AND is_active = 0 AND duration_seconds > 60
    `).get() as any;

    // Total stats
    const totals = db.prepare(`
      SELECT SUM(duration_seconds) / 3600.0 as total_hours,
        COUNT(*) as total_sessions,
        COUNT(DISTINCT date(start_time)) as days_studied
      FROM study_sessions
      WHERE start_time >= datetime('now', '-${days} days') AND is_active = 0
    `).get() as any;

    return { dailyStudy, bySubject, byActivity, avgSessionMinutes: avgSession?.avg_minutes || 0, totals };
  });

  ipcMain.handle('analytics:getQuestionAnalytics', (_e, range: any = {}) => {
    const days = range.days || 30;
    
    // Daily questions
    const dailyQuestions = db.prepare(`
      SELECT date(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN is_correct = 1 THEN 1 END) as correct,
        ROUND(CAST(COUNT(CASE WHEN is_correct = 1 THEN 1 END) AS REAL) / COUNT(*) * 100, 1) as accuracy
      FROM questions
      WHERE created_at >= datetime('now', '-${days} days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all();

    // By subject
    const bySubject = db.prepare(`
      SELECT s.name, s.color, COUNT(q.id) as total,
        COUNT(CASE WHEN q.is_correct = 1 THEN 1 END) as correct,
        ROUND(CAST(COUNT(CASE WHEN q.is_correct = 1 THEN 1 END) AS REAL) / COUNT(q.id) * 100, 1) as accuracy
      FROM questions q
      JOIN subjects s ON q.subject_id = s.id
      WHERE q.created_at >= datetime('now', '-${days} days')
      GROUP BY s.id ORDER BY total DESC
    `).all();

    // By difficulty
    const byDifficulty = db.prepare(`
      SELECT difficulty, COUNT(*) as total,
        COUNT(CASE WHEN is_correct = 1 THEN 1 END) as correct,
        ROUND(CAST(COUNT(CASE WHEN is_correct = 1 THEN 1 END) AS REAL) / COUNT(*) * 100, 1) as accuracy
      FROM questions
      WHERE created_at >= datetime('now', '-${days} days')
      GROUP BY difficulty
    `).all();

    // Mistake categories
    const mistakeCategories = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM mistakes
      WHERE created_at >= datetime('now', '-${days} days')
      GROUP BY category
      ORDER BY count DESC
    `).all();

    return { dailyQuestions, bySubject, byDifficulty, mistakeCategories };
  });

  ipcMain.handle('analytics:getWeakAreas', () => {
    return db.prepare(`
      SELECT t.id, t.name as topic_name, s.name as subject_name, s.color,
        t.status, t.confidence as topic_confidence,
        COUNT(q.id) as total_questions,
        COUNT(CASE WHEN q.is_correct = 1 THEN 1 END) as correct_questions,
        ROUND(CAST(COUNT(CASE WHEN q.is_correct = 1 THEN 1 END) AS REAL) / NULLIF(COUNT(q.id), 0) * 100, 1) as accuracy,
        (SELECT COUNT(*) FROM mistakes WHERE topic_id = t.id AND is_resolved = 0) as unresolved_mistakes,
        (SELECT MAX(revision_date) FROM revisions WHERE topic_id = t.id) as last_revision,
        (SELECT MAX(start_time) FROM study_sessions WHERE topic_id = t.id) as last_studied,
        COALESCE((SELECT SUM(duration_seconds) FROM study_sessions WHERE topic_id = t.id), 0) as total_study_seconds
      FROM topics t
      JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN questions q ON q.topic_id = t.id
      WHERE s.is_archived = 0
      GROUP BY t.id
      HAVING (
        (COUNT(q.id) >= 3 AND accuracy < 65)
        OR unresolved_mistakes >= 3
        OR (t.status = 'needs_revision')
        OR (t.confidence > 0 AND t.confidence < 40)
      )
      ORDER BY 
        CASE WHEN accuracy IS NULL THEN 100 ELSE accuracy END ASC,
        unresolved_mistakes DESC
      LIMIT 20
    `).all();
  });

  ipcMain.handle('analytics:getRecommendations', () => {
    const recommendations: any[] = [];
    
    // 1. Overdue revisions
    const overdueRevisions = db.prepare(`
      SELECT t.id as topic_id, t.name as topic_name, s.name as subject_name, s.color,
        r.next_revision_date, r.revision_number
      FROM revisions r
      INNER JOIN (SELECT topic_id, MAX(id) as max_id FROM revisions GROUP BY topic_id) latest
        ON r.id = latest.max_id
      LEFT JOIN topics t ON r.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE r.next_revision_date <= date('now')
      ORDER BY r.next_revision_date ASC
      LIMIT 3
    `).all() as any[];
    
    for (const rev of overdueRevisions) {
      recommendations.push({
        type: 'revision',
        priority: 'high',
        title: `Revise ${rev.subject_name} → ${rev.topic_name}`,
        reason: `Revision overdue since ${rev.next_revision_date}`,
        topic_id: rev.topic_id,
        color: rev.color,
      });
    }

    // 2. Weak topics needing practice
    const weakTopics = db.prepare(`
      SELECT t.id as topic_id, t.name as topic_name, s.name as subject_name, s.color,
        COUNT(q.id) as total_questions,
        ROUND(CAST(COUNT(CASE WHEN q.is_correct = 1 THEN 1 END) AS REAL) / NULLIF(COUNT(q.id), 0) * 100, 1) as accuracy
      FROM topics t
      JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN questions q ON q.topic_id = t.id
      WHERE s.is_archived = 0 AND t.status IN ('completed', 'learning')
      GROUP BY t.id
      HAVING COUNT(q.id) >= 5 AND accuracy < 60
      ORDER BY accuracy ASC
      LIMIT 3
    `).all() as any[];
    
    for (const topic of weakTopics) {
      recommendations.push({
        type: 'practice',
        priority: 'high',
        title: `Practice ${topic.subject_name} → ${topic.topic_name}`,
        reason: `Low accuracy: ${topic.accuracy}% over ${topic.total_questions} questions`,
        topic_id: topic.topic_id,
        color: topic.color,
      });
    }

    // 3. Topics learned but not practiced
    const unpracticed = db.prepare(`
      SELECT t.id as topic_id, t.name as topic_name, s.name as subject_name, s.color
      FROM topics t
      JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN questions q ON q.topic_id = t.id
      WHERE t.status IN ('completed', 'learning') AND s.is_archived = 0
      GROUP BY t.id
      HAVING COUNT(q.id) < 5
      ORDER BY t.updated_at ASC
      LIMIT 3
    `).all() as any[];
    
    for (const topic of unpracticed) {
      recommendations.push({
        type: 'practice',
        priority: 'medium',
        title: `Solve problems: ${topic.subject_name} → ${topic.topic_name}`,
        reason: 'Topic learned but needs more practice',
        topic_id: topic.topic_id,
        color: topic.color,
      });
    }

    // 4. Subjects with no recent study
    const neglectedSubjects = db.prepare(`
      SELECT s.id as subject_id, s.name as subject_name, s.color,
        MAX(ss.start_time) as last_studied
      FROM subjects s
      LEFT JOIN study_sessions ss ON ss.subject_id = s.id AND ss.is_active = 0
      WHERE s.is_archived = 0
      GROUP BY s.id
      HAVING last_studied IS NULL OR last_studied < datetime('now', '-14 days')
      LIMIT 2
    `).all() as any[];
    
    for (const subj of neglectedSubjects) {
      recommendations.push({
        type: 'study',
        priority: 'low',
        title: `Resume studying ${subj.subject_name}`,
        reason: subj.last_studied ? `Last studied ${subj.last_studied.slice(0, 10)}` : 'Not yet started',
        color: subj.color,
      });
    }

    return recommendations.slice(0, 8);
  });

  ipcMain.handle('analytics:getHeatmap', (_e, year: number) => {
    return db.prepare(`
      SELECT date(start_time) as date,
        SUM(duration_seconds) / 3600.0 as hours,
        COUNT(*) as sessions
      FROM study_sessions
      WHERE strftime('%Y', start_time) = ? AND is_active = 0
      GROUP BY date(start_time)
      ORDER BY date ASC
    `).all(String(year));
  });

  ipcMain.handle('analytics:getSubjectStats', (_e, subjectId: number) => {
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId) as any;
    if (!subject) return null;

    const totalStudy = db.prepare(`
      SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 as hours,
        COUNT(*) as sessions
      FROM study_sessions WHERE subject_id = ? AND is_active = 0
    `).get(subjectId) as any;

    const weekStudy = db.prepare(`
      SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 as hours
      FROM study_sessions WHERE subject_id = ? AND start_time >= datetime('now', '-7 days') AND is_active = 0
    `).get(subjectId) as any;

    const questions = db.prepare(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN is_correct = 1 THEN 1 END) as correct,
        COUNT(CASE WHEN is_pyq = 1 THEN 1 END) as pyqs
      FROM questions WHERE subject_id = ?
    `).get(subjectId) as any;

    const topics = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM questions WHERE topic_id = t.id) as question_count,
        (SELECT COUNT(*) FROM questions WHERE topic_id = t.id AND is_correct = 1) as correct_count,
        (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions WHERE topic_id = t.id) as study_seconds,
        (SELECT COUNT(*) FROM revisions WHERE topic_id = t.id) as revision_count
      FROM topics t WHERE t.subject_id = ?
      ORDER BY t.display_order
    `).all(subjectId);

    const recentSessions = db.prepare(`
      SELECT ss.*, t.name as topic_name
      FROM study_sessions ss
      LEFT JOIN topics t ON ss.topic_id = t.id
      WHERE ss.subject_id = ? AND ss.is_active = 0
      ORDER BY ss.start_time DESC LIMIT 10
    `).all(subjectId);

    const weeklyStudy = db.prepare(`
      SELECT date(start_time) as date, SUM(duration_seconds) / 3600.0 as hours
      FROM study_sessions
      WHERE subject_id = ? AND start_time >= datetime('now', '-30 days') AND is_active = 0
      GROUP BY date(start_time)
      ORDER BY date ASC
    `).all(subjectId);

    return {
      subject,
      totalStudyHours: totalStudy.hours,
      totalSessions: totalStudy.sessions,
      weekStudyHours: weekStudy.hours,
      totalQuestions: questions.total,
      correctQuestions: questions.correct,
      accuracy: questions.total > 0 ? Math.round(questions.correct / questions.total * 100) : 0,
      pyqCount: questions.pyqs,
      topics,
      recentSessions,
      weeklyStudy,
    };
  });

  ipcMain.handle('analytics:getTopicStats', (_e, topicId: number) => {
    const topic = db.prepare(`
      SELECT t.*, s.name as subject_name, s.color as subject_color
      FROM topics t LEFT JOIN subjects s ON t.subject_id = s.id WHERE t.id = ?
    `).get(topicId) as any;
    if (!topic) return null;

    const subtopics = db.prepare('SELECT * FROM subtopics WHERE topic_id = ? ORDER BY display_order').all(topicId);

    const studyStats = db.prepare(`
      SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 as hours, COUNT(*) as sessions
      FROM study_sessions WHERE topic_id = ? AND is_active = 0
    `).get(topicId) as any;

    const questions = db.prepare(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN is_correct = 1 THEN 1 END) as correct,
        COUNT(CASE WHEN is_pyq = 1 THEN 1 END) as pyqs
      FROM questions WHERE topic_id = ?
    `).get(topicId) as any;

    const mistakes = db.prepare(`
      SELECT * FROM mistakes WHERE topic_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(topicId);

    const revisions = db.prepare(`
      SELECT * FROM revisions WHERE topic_id = ? ORDER BY revision_date DESC
    `).all(topicId);

    const sessions = db.prepare(`
      SELECT ss.*, st.name as subtopic_name
      FROM study_sessions ss
      LEFT JOIN subtopics st ON ss.subtopic_id = st.id
      WHERE ss.topic_id = ? AND ss.is_active = 0
      ORDER BY ss.start_time DESC LIMIT 20
    `).all(topicId);

    return {
      topic,
      subtopics,
      studyHours: studyStats.hours,
      sessionCount: studyStats.sessions,
      totalQuestions: questions.total,
      correctQuestions: questions.correct,
      accuracy: questions.total > 0 ? Math.round(questions.correct / questions.total * 100) : 0,
      pyqCount: questions.pyqs,
      mistakes,
      revisions,
      sessions,
    };
  });
}
