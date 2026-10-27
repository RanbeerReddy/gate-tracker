import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import {
  getSupabase,
  fetchUserProfile,
  updateUserProfile,
  updatePrivacySettings,
  clearSupabaseSession,
  restoreSessionFromSQLite,
  setSessionFromTokens,
  signInWithOAuth as supabaseSignInWithOAuth,
} from '../services/supabase';
import { syncLocalProgressToCloud } from '../services/syncProgress';
import { UserProfile, PrivacySettings } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  privacySettings: PrivacySettings;
  mode: 'local' | 'authenticated';
  isOnline: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string, displayName: string, targetYear?: number) => Promise<{ error?: string }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  updatePrivacy: (settings: Partial<PrivacySettings>) => Promise<boolean>;
  syncProgress: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  user_id: '',
  share_profile: true,
  share_calendar: true,
  share_study_hours: true,
  share_question_stats: true,
  share_syllabus_progress: true,
  share_mock_performance: false,
  share_subject_progress: true,
  visibility: 'public',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Refs to avoid stale closures in callbacks and listeners
  const userRef = useRef<User | null>(null);
  const privacyRef = useRef<PrivacySettings>(DEFAULT_PRIVACY);
  const loadingRef = useRef<boolean>(true);

  // Keep refs in sync with state
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { privacyRef.current = privacySettings; }, [privacySettings]);
  useEffect(() => { loadingRef.current = isLoading; }, [isLoading]);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Persist privacy settings to local SQLite so they survive app restarts
   * regardless of network connectivity.
   */
  const savePrivacyLocally = useCallback(async (settings: PrivacySettings, targetUserId?: string) => {
    try {
      const userId = targetUserId || userRef.current?.id || 'local';
      await window.electronAPI.privacy.set(settings, userId);
    } catch (err) {
      console.warn('Failed to save privacy settings locally:', err);
    }
  }, []);

  /**
   * Load privacy settings from local SQLite cache.
   * Returns null if not found (first run or migration hasn't run yet).
   */
  const loadPrivacyLocally = useCallback(async (targetUserId?: string): Promise<PrivacySettings | null> => {
    try {
      const userId = targetUserId || userRef.current?.id || 'local';
      const local = await window.electronAPI.privacy.get(userId);
      if (local) {
        return { ...DEFAULT_PRIVACY, ...local };
      }
    } catch (err) {
      console.warn('Failed to load local privacy settings:', err);
    }
    return null;
  }, []);

  const loadUserData = useCallback(async (userId: string, authUser?: User | null) => {
    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const p = await fetchUserProfile(userId);
        if (p) {
          setProfile(p);
          if (p.privacy) {
            const mergedPrivacy = { ...DEFAULT_PRIVACY, ...p.privacy };
            setPrivacySettings(mergedPrivacy);
            // Persist cloud privacy settings locally for offline access
            savePrivacyLocally(mergedPrivacy, userId);
          }
          setIsLoading(false);
          return; // Success — exit early
        }
      } catch (err) {
        lastError = err;
        console.warn(`Profile load attempt ${attempt + 1}/${MAX_RETRIES} failed:`, err);
      }

      // Exponential backoff: 500ms, 1500ms, 3500ms
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }

    // All retries exhausted — build a fallback profile from user_metadata
    console.warn('All profile load retries failed, using user_metadata fallback:', lastError);
    const resolvedUser = authUser || userRef.current;
    const meta = resolvedUser?.user_metadata;
    if (meta) {
      setProfile({
        id: userId,
        username: meta.username || resolvedUser?.email?.split('@')[0] || 'user',
        display_name: meta.display_name || meta.full_name || meta.username || resolvedUser?.email?.split('@')[0] || 'GATE Aspirant',
        avatar_url: meta.avatar_url || meta.picture || null,
        bio: null,
        target_gate_year: meta.target_gate_year || null,
        target_score: null,
        created_at: resolvedUser?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    // Even if cloud failed, local privacy settings were already loaded in initAuth
    setIsLoading(false);
  }, [savePrivacyLocally]);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cleanupDeepLink: (() => void) | null = null;

    const initAuth = async () => {
      // Load local privacy settings immediately (no network needed)
      const localPrivacy = await loadPrivacyLocally('local');
      if (localPrivacy) {
        setPrivacySettings(localPrivacy);
      }

      const sb = getSupabase();

      try {
        let { data: { session } } = await sb.auth.getSession();

        // Restore session from SQLite backup if localStorage was cleared on PC reboot
        if (!session) {
          const restored = await restoreSessionFromSQLite();
          if (restored) {
            const { data: { session: restoredSession } } = await sb.auth.getSession();
            session = restoredSession;
          }
        }

        if (session?.user) {
          setUser(session.user);
          const userPrivacy = await loadPrivacyLocally(session.user.id);
          if (userPrivacy) {
            setPrivacySettings(userPrivacy);
          }
          await loadUserData(session.user.id, session.user);
          // Sync local study metrics to cloud on app launch so data is always up to date
          syncLocalProgressToCloud(session.user.id, userPrivacy || privacyRef.current).catch(() => {});
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Auth session check fallback (Local Mode):', err);
        setIsLoading(false);
      }

      // Listen for auth state changes (token refresh, sign in from deep link, etc.)
      const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
        console.log(`Auth state change: ${event}`);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            // Only reload full user data on actual sign-in, not token refresh
            if (event === 'SIGNED_IN') {
              await loadUserData(session.user.id, session.user);
              syncLocalProgressToCloud(session.user.id, privacyRef.current).catch(() => {});
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setPrivacySettings(DEFAULT_PRIVACY);
          setIsLoading(false);
        }
      });

      unsubscribe = () => subscription.unsubscribe();

      // Listen for OAuth deep link callbacks from the main process
      if (window.electronAPI?.auth?.onDeepLink) {
        cleanupDeepLink = window.electronAPI.auth.onDeepLink(async (tokens) => {
          console.log('Received auth deep link callback');
          const result = await setSessionFromTokens(tokens.access_token, tokens.refresh_token);
          if (result.error) {
            console.error('Failed to set session from deep link:', result.error);
          }
          // The onAuthStateChange listener above will handle the rest
        });
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
      if (cleanupDeepLink) cleanupDeepLink();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { error: error.message };
      if (data.user) {
        setUser(data.user);
        await loadUserData(data.user.id, data.user);
        syncLocalProgressToCloud(data.user.id, privacyRef.current).catch(() => {});
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    targetYear?: number
  ): Promise<{ error?: string }> => {
    try {
      const sb = getSupabase();
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanUsername.length < 3) {
        return { error: 'Username must be at least 3 alphanumeric characters.' };
      }

      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: cleanUsername,
            display_name: displayName.trim() || 'GATE Aspirant',
            target_gate_year: targetYear || new Date().getFullYear() + 1,
          },
        },
      });

      if (error) {
        if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
          return { error: 'Could not reach Supabase backend. Please verify your Supabase URL & Key in .env and rebuild.' };
        }
        return { error: error.message };
      }
      if (data.user) {
        setUser(data.user);
        // Initialize cloud privacy with active defaults so progress and calendar are visible
        try {
          await updatePrivacySettings(data.user.id, {
            share_profile: true,
            share_calendar: true,
            share_study_hours: true,
            share_question_stats: true,
            share_syllabus_progress: true,
            share_subject_progress: true,
          });
        } catch (_) {}

        await loadUserData(data.user.id, data.user);
        syncLocalProgressToCloud(data.user.id, DEFAULT_PRIVACY).catch(() => {});
      }
      return {};
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.message?.includes('fetch')) {
        return { error: 'Could not reach Supabase backend. Please verify your Supabase URL & Key in .env and rebuild.' };
      }
      return { error: err.message || 'Sign up failed' };
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github'): Promise<{ error?: string }> => {
    return supabaseSignInWithOAuth(provider);
  };

  const signOut = async () => {
    // Always clear state first so the UI updates immediately
    setUser(null);
    setProfile(null);
    setPrivacySettings(DEFAULT_PRIVACY);

    // Restore unauthenticated local privacy settings
    try {
      const localPrivacy = await loadPrivacyLocally('local');
      if (localPrivacy) {
        setPrivacySettings(localPrivacy);
      }
    } catch (_) {}

    try {
      const sb = getSupabase();
      await sb.auth.signOut();
    } catch (err) {
      console.error('Sign out error (may be offline):', err);
    }

    // Clear all Supabase auth tokens and reset client instance.
    clearSupabaseSession();
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    const currentUser = userRef.current;
    if (!currentUser) return false;
    const ok = await updateUserProfile(currentUser.id, data);
    if (ok) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
    }
    return ok;
  };

  const handleUpdatePrivacy = async (settings: Partial<PrivacySettings>): Promise<boolean> => {
    const currentUser = userRef.current;
    if (!currentUser) return false;
    const merged = { ...privacyRef.current, ...settings };

    // Save locally FIRST for instant persistence
    savePrivacyLocally(merged, currentUser.id);
    setPrivacySettings(merged);

    // Then sync to cloud
    const ok = await updatePrivacySettings(currentUser.id, settings);
    if (ok) {
      // Trigger cloud progress sync with new privacy settings
      syncLocalProgressToCloud(currentUser.id, merged).catch(() => {});
    }
    return ok;
  };

  const handleRefreshProfile = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    await loadUserData(currentUser.id, currentUser);
  }, [loadUserData]);

  const handleSyncProgress = async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    await syncLocalProgressToCloud(currentUser.id, privacyRef.current);
    // Re-fetch profile data from cloud to display the actual synced values
    await loadUserData(currentUser.id, currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        privacySettings,
        mode: user ? 'authenticated' : 'local',
        isOnline,
        isLoading,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        updateProfile: handleUpdateProfile,
        updatePrivacy: handleUpdatePrivacy,
        syncProgress: handleSyncProgress,
        refreshProfile: handleRefreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
