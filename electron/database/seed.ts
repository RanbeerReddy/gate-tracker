import { getDatabase } from './connection';
import { log } from '../utils/logger';
import { GATE_PAPERS } from '../../src/config/gatePapers';

const DEFAULT_SETTINGS: Record<string, string> = {
  theme: 'dark',
  date_format: 'yyyy-MM-dd',
  time_format: 'HH:mm',
  daily_study_target_hours: '7',
  revision_intervals: '1,3,7,14,30',
  first_run_complete: 'false',
  gate_paper: 'CS',
  target_gate_year: '2027',
  target_score: '',
  target_rank: '',
  gate_exam_date: '2027-02-07',
  gate_exam_name: 'GATE CSE 2027',
};

export function seedData(): void {
  const db = getDatabase();
  
  // Check if subjects already exist
  const subjectCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get() as any;
  if (subjectCount.count > 0) {
    log('Seed data already exists, skipping initial subject seeding.');
    
    // Ensure default settings exist
    seedSettings();
    return;
  }
  
  log('Seeding initial multi-paper data (CS + EC)...');
  
  const insertSubject = db.prepare(
    'INSERT INTO subjects (name, color, display_order, gate_paper) VALUES (?, ?, ?, ?)'
  );
  const insertTopic = db.prepare(
    'INSERT INTO topics (subject_id, name, display_order) VALUES (?, ?, ?)'
  );
  const insertSubtopic = db.prepare(
    'INSERT INTO subtopics (topic_id, name, display_order) VALUES (?, ?, ?)'
  );
  
  const seedAll = db.transaction(() => {
    let globalOrder = 0;

    // 1. Seed CS Subjects (General Aptitude is tagged as SHARED)
    const csPaper = GATE_PAPERS.CS;
    for (const subject of csPaper.subjects) {
      const isShared = subject.name === 'General Aptitude';
      const paperTag = isShared ? 'SHARED' : 'CS';
      const subjectResult = insertSubject.run(subject.name, subject.color, globalOrder++, paperTag);
      const subjectId = subjectResult.lastInsertRowid as number;

      subject.topics.forEach((topic, tIdx) => {
        const topicResult = insertTopic.run(subjectId, topic.name, tIdx);
        const topicId = topicResult.lastInsertRowid as number;

        topic.subtopics.forEach((subtopic, stIdx) => {
          insertSubtopic.run(topicId, subtopic, stIdx);
        });
      });
    }

    // 2. Seed EC Subjects (Skip General Aptitude since already seeded as SHARED)
    const ecPaper = GATE_PAPERS.EC;
    for (const subject of ecPaper.subjects) {
      if (subject.name === 'General Aptitude') continue;
      const subjectResult = insertSubject.run(subject.name, subject.color, globalOrder++, 'EC');
      const subjectId = subjectResult.lastInsertRowid as number;

      subject.topics.forEach((topic, tIdx) => {
        const topicResult = insertTopic.run(subjectId, topic.name, tIdx);
        const topicId = topicResult.lastInsertRowid as number;

        topic.subtopics.forEach((subtopic, stIdx) => {
          insertSubtopic.run(topicId, subtopic, stIdx);
        });
      });
    }
    
    // Insert active session recovery row
    db.prepare('INSERT OR IGNORE INTO active_session (id, session_data) VALUES (1, NULL)').run();
  });
  
  seedAll();
  seedSettings();
  
  log('Multi-paper seed data inserted successfully.');
}

function seedSettings(): void {
  const db = getDatabase();
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  
  const seedSettingsTransaction = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, value);
    }
  });
  
  seedSettingsTransaction();
}

