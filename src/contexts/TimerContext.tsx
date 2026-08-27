import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { StudySession, Subject, Topic, Subtopic, ActivityType } from '../types';

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  sessionId: number | null;
  subjectId: number | null;
  topicId: number | null;
  subtopicId: number | null;
  activityType: ActivityType;
  startTime: number | null; // timestamp ms
  elapsed: number; // seconds (active study time only)
  pauseStart: number | null;
  totalPauseTime: number; // seconds
  subjectName: string;
  topicName: string;
}

interface TimerContextType {
  timer: TimerState;
  startSession: (data: {
    subjectId: number;
    topicId?: number;
    subtopicId?: number;
    activityType: ActivityType;
    subjectName: string;
    topicName?: string;
  }) => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  finishSession: (data?: { notes?: string; questions_solved?: number; focus_rating?: number }) => Promise<StudySession | null>;
  formatTime: (seconds: number) => string;
}

const defaultTimer: TimerState = {
  isRunning: false,
  isPaused: false,
  sessionId: null,
  subjectId: null,
  topicId: null,
  subtopicId: null,
  activityType: 'learning',
  startTime: null,
  elapsed: 0,
  pauseStart: null,
  totalPauseTime: 0,
  subjectName: '',
  topicName: '',
};

const TimerContext = createContext<TimerContextType>({
  timer: defaultTimer,
  startSession: async () => {},
  pauseSession: () => {},
  resumeSession: () => {},
  finishSession: async () => null,
  formatTime: () => '00:00:00',
});

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<TimerState>(defaultTimer);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Update elapsed time every second with sleep/drift gap protection
  useEffect(() => {
    if (timer.isRunning && !timer.isPaused && timer.startTime) {
      lastTickRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        lastTickRef.current = now;

        // Gap detection: if interval was blocked or OS was in sleep/suspend (> 2500ms between 1s ticks)
        if (delta > 2500) {
          const sleepGapSeconds = Math.floor((delta - 1000) / 1000);
          setTimer(prev => {
            const updatedPauseTime = prev.totalPauseTime + sleepGapSeconds;
            const totalElapsed = Math.floor((now - prev.startTime!) / 1000);
            const activeElapsed = Math.max(0, totalElapsed - updatedPauseTime);
            return {
              ...prev,
              totalPauseTime: updatedPauseTime,
              elapsed: activeElapsed,
            };
          });
          return;
        }

        const totalElapsed = Math.floor((now - timer.startTime!) / 1000);
        const activeElapsed = totalElapsed - timer.totalPauseTime;
        setTimer(prev => ({ ...prev, elapsed: Math.max(0, activeElapsed) }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer.isRunning, timer.isPaused, timer.startTime, timer.totalPauseTime]);

  // Listen to OS power suspend & resume events
  useEffect(() => {
    if (!window.electronAPI?.power) return;

    const cleanupSuspend = window.electronAPI.power.onSuspend(() => {
      setTimer(prev => {
        if (!prev.isRunning || prev.isPaused) return prev;
        return {
          ...prev,
          isPaused: true,
          pauseStart: Date.now(),
        };
      });
    });

    const cleanupResume = window.electronAPI.power.onResume((durationSeconds: number) => {
      if (durationSeconds > 0) {
        setTimer(prev => {
          if (!prev.isRunning) return prev;
          return {
            ...prev,
            totalPauseTime: prev.totalPauseTime + durationSeconds,
          };
        });
      }
    });

    return () => {
      cleanupSuspend();
      cleanupResume();
    };
  }, []);

  // Save active state periodically for crash recovery
  useEffect(() => {
    if (timer.isRunning && timer.sessionId) {
      const saveInterval = setInterval(() => {
        window.electronAPI.sessions.saveActiveState({
          ...timer,
          isActive: true,
        });
      }, 10000); // Save every 10 seconds
      return () => clearInterval(saveInterval);
    }
  }, [timer.isRunning, timer.sessionId]);

  // Restore active session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const activeState = await window.electronAPI.sessions.getActiveState();
        if (activeState?.isActive && activeState.sessionId) {
          // Restore timer state in paused mode so user can resume consciously
          setTimer({
            isRunning: true,
            isPaused: true,
            sessionId: activeState.sessionId,
            subjectId: activeState.subjectId,
            topicId: activeState.topicId,
            subtopicId: activeState.subtopicId,
            activityType: activeState.activityType || 'learning',
            startTime: activeState.startTime,
            elapsed: activeState.elapsed || 0,
            pauseStart: Date.now(),
            totalPauseTime: activeState.totalPauseTime || 0,
            subjectName: activeState.subjectName || '',
            topicName: activeState.topicName || '',
          });
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      }
    };
    restore();
  }, []);

  // Handle force save from main process (on close)
  useEffect(() => {
    const cleanup = window.electronAPI.onForceSaveSession(async () => {
      if (timer.isRunning && timer.sessionId) {
        await window.electronAPI.sessions.finish(timer.sessionId, {
          duration_seconds: timer.elapsed,
          pause_duration_seconds: timer.totalPauseTime,
        });
      }
    });
    return cleanup;
  }, [timer]);

  const startSession = useCallback(async (data: {
    subjectId: number;
    topicId?: number;
    subtopicId?: number;
    activityType: ActivityType;
    subjectName: string;
    topicName?: string;
  }) => {
    const session = await window.electronAPI.sessions.start({
      subject_id: data.subjectId,
      topic_id: data.topicId || null,
      subtopic_id: data.subtopicId || null,
      activity_type: data.activityType,
    });

    const now = Date.now();
    setTimer({
      isRunning: true,
      isPaused: false,
      sessionId: session.id,
      subjectId: data.subjectId,
      topicId: data.topicId || null,
      subtopicId: data.subtopicId || null,
      activityType: data.activityType,
      startTime: now,
      elapsed: 0,
      pauseStart: null,
      totalPauseTime: 0,
      subjectName: data.subjectName,
      topicName: data.topicName || '',
    });
  }, []);

  const pauseSession = useCallback(() => {
    setTimer(prev => ({
      ...prev,
      isPaused: true,
      pauseStart: Date.now(),
    }));
  }, []);

  const resumeSession = useCallback(() => {
    setTimer(prev => {
      const pauseDuration = prev.pauseStart ? Math.floor((Date.now() - prev.pauseStart) / 1000) : 0;
      return {
        ...prev,
        isPaused: false,
        pauseStart: null,
        totalPauseTime: prev.totalPauseTime + pauseDuration,
      };
    });
  }, []);

  const finishSession = useCallback(async (data?: { notes?: string; questions_solved?: number; focus_rating?: number }) => {
    if (!timer.sessionId) return null;

    // If paused, add pause time
    let totalPause = timer.totalPauseTime;
    if (timer.isPaused && timer.pauseStart) {
      totalPause += Math.floor((Date.now() - timer.pauseStart) / 1000);
    }

    const session = await window.electronAPI.sessions.finish(timer.sessionId, {
      duration_seconds: timer.elapsed,
      pause_duration_seconds: totalPause,
      notes: data?.notes || null,
      questions_solved: data?.questions_solved || 0,
      focus_rating: data?.focus_rating || null,
    });

    await window.electronAPI.sessions.clearActiveState();
    setTimer(defaultTimer);
    return session;
  }, [timer]);

  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  return (
    <TimerContext.Provider value={{ timer, startSession, pauseSession, resumeSession, finishSession, formatTime }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => useContext(TimerContext);
