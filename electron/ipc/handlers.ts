import { registerSubjectHandlers } from './subjects';
import { registerSessionHandlers } from './sessions';
import { registerQuestionHandlers } from './questions';
import { registerMistakeHandlers } from './mistakes';
import { registerRevisionHandlers } from './revisions';
import { registerMockHandlers } from './mocks';
import { registerPlannerHandlers } from './planner';
import { registerGoalHandlers } from './goals';
import { registerAnalyticsHandlers } from './analytics';
import { registerSettingsHandlers } from './settings';
import { registerSearchHandlers } from './search';
import { registerEventHandlers } from './events';
import { log } from '../utils/logger';

export function registerAllHandlers(): void {
  registerSubjectHandlers();
  registerSessionHandlers();
  registerQuestionHandlers();
  registerMistakeHandlers();
  registerRevisionHandlers();
  registerMockHandlers();
  registerPlannerHandlers();
  registerGoalHandlers();
  registerAnalyticsHandlers();
  registerSettingsHandlers();
  registerSearchHandlers();
  registerEventHandlers();
  log('All IPC handlers registered.');
}
