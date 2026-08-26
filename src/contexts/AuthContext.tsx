import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabase, fetchUserProfile, updateUserProfile, updatePrivacySettings } from '../services/supabase';
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
}

const DEFAULT_PRIVACY: PrivacySettings = {
  user_id: '',
  share_profile: false,
  share_calendar: false,
  share_study_hours: false,
  share_question_stats: false,
  share_syllabus_progress: false,
  share_mock_performance: false,
  share_subject_progress: false,
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

  // Initialize session and listen for auth state changes
  useEffect(() => {
    const sb = getSupabase();

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    }).catch(err => {
      console.warn('Auth session check fallback (Local Mode):', err);
      setIsLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user.id);
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
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const p = await fetchUserProfile(userId);
      if (p) {
        setProfile(p);
        if (p.privacy) {
          setPrivacySettings(p.privacy);
        }
      }
    } catch (err) {
      console.warn('Could not load user data from cloud:', err);
    } finally {
      setIsLoading(false);
    }
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
        await loadUserData(data.user.id);
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
        await loadUserData(data.user.id);
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
    try {
      const sb = getSupabase();
      await sb.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setPrivacySettings(DEFAULT_PRIVACY);
    }
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
    const ok = await updatePrivacySettings(user.id, settings);
    if (ok) {
      setPrivacySettings(prev => ({ ...prev, ...settings }));
      // Trigger cloud progress sync with new privacy settings
      syncLocalProgressToCloud(user.id, { ...privacySettings, ...settings }).catch(() => {});
    }
    return ok;
  };

  const handleSyncProgress = async () => {
    if (!user) return;
    await syncLocalProgressToCloud(user.id, privacySettings);
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
