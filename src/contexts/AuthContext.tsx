import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabase, fetchUserProfile, updateUserProfile, updatePrivacySettings, clearSupabaseSession } from '../services/supabase';
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
      await window.electronAPI.privacy.set(settings, targetUserId || user?.id || 'local');
    } catch (err) {
      console.warn('Failed to save privacy settings locally:', err);
    }
  }, [user]);

  /**
   * Load privacy settings from local SQLite cache.
   * Returns null if not found (first run or migration hasn't run yet).
   */
  const loadPrivacyLocally = useCallback(async (targetUserId?: string): Promise<PrivacySettings | null> => {
    try {
      const local = await window.electronAPI.privacy.get(targetUserId || user?.id || 'local');
      if (local) {
        return { ...DEFAULT_PRIVACY, ...local };
      }
    } catch (err) {
      console.warn('Failed to load local privacy settings:', err);
    }
    return null;
  }, [user]);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    const initAuth = async () => {
      // Load local privacy settings immediately (no network needed)
      const localPrivacy = await loadPrivacyLocally();
      if (localPrivacy) {
        setPrivacySettings(localPrivacy);
      }

      const sb = getSupabase();

      try {
        let { data: { session } } = await sb.auth.getSession();

        // Restore session from SQLite backup if localStorage was cleared on PC reboot
        if (!session && window.electronAPI?.settings) {
          try {
            const savedSessionStr = await window.electronAPI.settings.get('supabase_session');
            if (savedSessionStr) {
              const parsed = JSON.parse(savedSessionStr);
              if (parsed?.access_token && parsed?.refresh_token) {
                const { data, error } = await sb.auth.setSession({
                  access_token: parsed.access_token,
                  refresh_token: parsed.refresh_token,
                });
                if (!error && data.session) {
                  session = data.session;
                }
              }
            }
          } catch (err) {
            console.warn('SQLite session restore fallback:', err);
          }
        }

        if (session?.user) {
          setUser(session.user);
          if (window.electronAPI?.settings) {
            window.electronAPI.settings.set('supabase_session', JSON.stringify(session)).catch(() => {});
          }
          await loadUserData(session.user.id, session.user);
          // Sync local study metrics to cloud on app launch so data is always up to date
          syncLocalProgressToCloud(session.user.id, localPrivacy || privacySettings).catch(() => {});
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Auth session check fallback (Local Mode):', err);
        setIsLoading(false);
      }

      const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          if (window.electronAPI?.settings) {
            window.electronAPI.settings.set('supabase_session', JSON.stringify(session)).catch(() => {});
          }
          await loadUserData(session.user.id, session.user);
          syncLocalProgressToCloud(session.user.id, privacySettings).catch(() => {});
        } else {
          setUser(null);
          setProfile(null);
          setPrivacySettings(DEFAULT_PRIVACY);
          setIsLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    initAuth();
  }, []);

  const loadUserData = async (userId: string, authUser?: User | null) => {
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
            savePrivacyLocally(mergedPrivacy);
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
    const resolvedUser = authUser || user;
    const meta = resolvedUser?.user_metadata;
    if (meta) {
      setProfile({
        id: userId,
        username: meta.username || resolvedUser?.email?.split('@')[0] || 'user',
        display_name: meta.display_name || meta.username || resolvedUser?.email?.split('@')[0] || 'GATE Aspirant',
        avatar_url: meta.avatar_url || null,
        bio: null,
        target_gate_year: meta.target_gate_year || null,
        target_score: null,
        created_at: resolvedUser?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    // Even if cloud failed, local privacy settings were already loaded in initAuth
    setIsLoading(false);
  };

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
        if (data.session && window.electronAPI?.settings) {
          window.electronAPI.settings.set('supabase_session', JSON.stringify(data.session)).catch(() => {});
        }
        await loadUserData(data.user.id, data.user);
        syncLocalProgressToCloud(data.user.id, privacySettings).catch(() => {});
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
        if (data.session && window.electronAPI?.settings) {
          window.electronAPI.settings.set('supabase_session', JSON.stringify(data.session)).catch(() => {});
        }
        await loadUserData(data.user.id, data.user);
        syncLocalProgressToCloud(data.user.id, privacySettings).catch(() => {});
      }
      return {};
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.message?.includes('fetch')) {
        return { error: 'Could not reach Supabase backend. Please verify your Supabase URL & Key in .env and rebuild.' };
      }
      return { error: err.message || 'Sign up failed' };
    }
  };

  const signOut = async () => {
    // Always clear state first so the UI updates immediately
    setUser(null);
    setProfile(null);
    setPrivacySettings(DEFAULT_PRIVACY);

    // Clear SQLite session backup
    if (window.electronAPI?.settings) {
      window.electronAPI.settings.set('supabase_session', '').catch(() => {});
    }

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
    if (!user) return false;
    const ok = await updateUserProfile(user.id, data);
    if (ok) {
      setProfile(prev => prev ? { ...prev, ...data } : null);
    }
    return ok;
  };

  const handleUpdatePrivacy = async (settings: Partial<PrivacySettings>): Promise<boolean> => {
    if (!user) return false;
    const merged = { ...privacySettings, ...settings };

    // Save locally FIRST for instant persistence
    savePrivacyLocally(merged);
    setPrivacySettings(merged);

    // Then sync to cloud
    const ok = await updatePrivacySettings(user.id, settings);
    if (ok) {
      // Trigger cloud progress sync with new privacy settings
      syncLocalProgressToCloud(user.id, merged).catch(() => {});
    }
    return ok;
  };

  const handleRefreshProfile = useCallback(async () => {
    if (!user) return;
    await loadUserData(user.id, user);
  }, [user]);

  const handleSyncProgress = async () => {
    if (!user) return;
    await syncLocalProgressToCloud(user.id, privacySettings);
    // Re-fetch profile data from cloud to display the actual synced values
    await loadUserData(user.id, user);
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
