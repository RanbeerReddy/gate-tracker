import { getSupabase } from './supabase';
import { PrivacySettings } from '../types';

/**
 * Aggregates local study data from SQLite and publishes ONLY authorized,
 * derived aggregate statistics to the cloud shared_progress & shared_calendar tables.
 * 
 * CRITICAL PRIVACY GUARANTEE:
 * - Detailed private session notes, exact timestamps, question text, and mistake entries
 *   are NEVER transmitted.
 * - Only aggregate numbers (total hours, accuracy %, syllabus %, sanitized calendar days)
 *   are synced, and ONLY IF enabled in user PrivacySettings.
 */
export async function syncLocalProgressToCloud(userId: string, privacy: PrivacySettings): Promise<{ success: boolean; message?: string }> {
  try {
    const sb = getSupabase();

    // 1. If user disabled profile sharing, clear any public shared progress
    if (!privacy.share_profile) {
      await sb.from('shared_progress').upsert({
        user_id: userId,
        total_study_hours: 0,
        days_studied: 0,
        current_streak: 0,
        questions_solved: 0,
        overall_accuracy: 0,
        syllabus_completion: 0,
        subject_progress: [],
        updated_at: new Date().toISOString(),
      });
    } else {
      // Query local SQLite metrics via electronAPI
      const [dashboard, heatmap, studyStats, questionStats] = await Promise.all([
        window.electronAPI.analytics.getDashboard(),
        window.electronAPI.analytics.getHeatmap(new Date().getFullYear()),
        window.electronAPI.analytics.getStudyAnalytics(365),
        window.electronAPI.analytics.getQuestionAnalytics(365),
      ]);

      const totalHours = Math.round(((dashboard.week?.studySeconds || 0) / 3600 + (studyStats?.total_hours || 0)) * 10) / 10;
      const daysStudied = heatmap.filter((h: any) => h.hours > 0).length;

      // Calculate current study streak
      let streak = 0;
      const today = new Date();
      const heatmapMap = new Map(heatmap.map((h: any) => [h.date, h.hours]));

      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const hours = heatmapMap.get(dateStr) || 0;
        if (hours > 0) {
          streak++;
        } else if (i > 0) {
          // Break streak if missed past day (today may still be 0 if early)
          break;
        }
      }

      // Calculate syllabus completion %
      const syllabus = dashboard.syllabus;
      const syllabusPercent = syllabus?.total_topics > 0
        ? Math.round(((syllabus.completed + (syllabus as any).strong || 0) / syllabus.total_topics) * 100)
        : 0;

      // Calculate subject completion list
      const subjectProgress = (dashboard.subjectCompletion || []).map((s: any) => ({
        name: s.name,
        color: s.color,
        completion: s.percent || 0,
        hours: Math.round((s.study_seconds || 0) / 3600),
      }));

      // Prepare payload respecting granular privacy toggles
      const payload: any = {
        user_id: userId,
        updated_at: new Date().toISOString(),
        total_study_hours: privacy.share_study_hours ? totalHours : 0,
        days_studied: privacy.share_study_hours ? daysStudied : 0,
        current_streak: privacy.share_study_hours ? streak : 0,
        questions_solved: privacy.share_question_stats ? (questionStats?.total_questions || 0) : 0,
        overall_accuracy: privacy.share_question_stats ? Math.round(questionStats?.overall_accuracy || 0) : 0,
        syllabus_completion: privacy.share_syllabus_progress ? syllabusPercent : 0,
        subject_progress: privacy.share_subject_progress ? subjectProgress : [],
      };

      await sb.from('shared_progress').upsert(payload);
    }

    // 2. Sync Shared Study Calendar (Sanitized Daily Hours Only)
    if (privacy.share_calendar) {
      const currentYear = new Date().getFullYear();
      const heatmap = await window.electronAPI.analytics.getHeatmap(currentYear);
      
      const calendarRows = heatmap
        .filter((h: any) => h.hours > 0)
        .map((h: any) => ({
          user_id: userId,
          date: h.date,
          study_hours: Math.round(h.hours * 10) / 10,
          studied: true,
          updated_at: new Date().toISOString(),
        }));

      if (calendarRows.length > 0) {
        await sb.from('shared_calendar').upsert(calendarRows, { onConflict: 'user_id,date' });
      }
    } else {
      // If calendar sharing disabled, clear entries
      await sb.from('shared_calendar').delete().eq('user_id', userId);
    }

    return { success: true, message: 'Progress synchronized' };
  } catch (err: any) {
    console.warn('Sync progress error (offline or unconfigured):', err);
    return { success: false, message: err?.message || 'Sync failed' };
  }
}
