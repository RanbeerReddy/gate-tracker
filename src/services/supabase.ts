import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserProfile,
  PrivacySettings,
  SharedProgress,
  SharedCalendarDay,
  CommunityPost,
  PostComment,
  Friendship,
} from '../types';

// Supabase project configuration from environment variables ONLY.
// No hardcoded fallbacks — prevents bundling developer credentials into the package.
const SUPABASE_URL =
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  '';

const SUPABASE_ANON_KEY =
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  '';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: window.localStorage,
      },
    });
  }
  return supabaseClient;
}

/**
 * Clears all Supabase auth tokens from localStorage and resets the client instance.
 * Used on first launch to prevent inheriting a bundled auth session from the build machine,
 * and after sign-out to ensure a completely clean state.
 */
export function clearSupabaseSession(): void {
  try {
    const keysToRemove = Object.keys(localStorage).filter(
      k => k.startsWith('sb-') && (k.endsWith('-auth-token') || k.includes('supabase'))
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (_) {
    // localStorage may be unavailable
  }
  // Reset the client so it doesn't hold a stale session in memory
  supabaseClient = null;
}

// ==========================================
// AUTHENTICATION & PROFILES
// ==========================================

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const sb = getSupabase();
    const { data: profile, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) return null;

    // Fetch privacy settings
    const { data: privacy } = await sb
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch shared progress if permitted
    let progress: SharedProgress | undefined;
    if (privacy?.share_profile) {
      const { data: prog } = await sb
        .from('shared_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (prog) progress = prog as SharedProgress;
    }

    return {
      ...profile,
      privacy: privacy || undefined,
      progress,
    };
  } catch (err) {
    console.error('Error fetching profile:', err);
    return null;
  }
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<boolean> {
  try {
    const sb = getSupabase();
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (data.display_name !== undefined) updatePayload.display_name = data.display_name;
    if (data.avatar_url !== undefined) updatePayload.avatar_url = data.avatar_url;
    if (data.bio !== undefined) updatePayload.bio = data.bio;
    if (data.target_gate_year !== undefined) updatePayload.target_gate_year = data.target_gate_year;
    if (data.target_score !== undefined) updatePayload.target_score = data.target_score;

    // Try update with gate_paper if provided
    let errToThrow: any = null;
    if (data.gate_paper !== undefined) {
      const { error: errorWithPaper } = await sb
        .from('profiles')
        .update({ ...updatePayload, gate_paper: data.gate_paper })
        .eq('id', userId);
      
      if (!errorWithPaper) return true;
      errToThrow = errorWithPaper;
    }

    // Fallback update without gate_paper if column is not on remote schema
    const { error } = await sb
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) throw errToThrow || error;
    return true;
  } catch (err) {
    console.error('Error updating profile:', err);
    return false;
  }
}

export async function updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<boolean> {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('privacy_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating privacy settings:', err);
    return false;
  }
}

// ==========================================
// COMMUNITY POSTS & FEED
// ==========================================

export async function fetchCommunityPosts(
  page: number = 0,
  limit: number = 20,
  filter: 'latest' | 'popular' = 'latest',
  paperFilter: 'all' | 'CS' | 'EC' = 'all'
): Promise<CommunityPost[]> {
  try {
    const sb = getSupabase();
    let query = sb
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, display_name, avatar_url, target_gate_year)
      `)
      .range(page * limit, (page + 1) * limit - 1);

    if (filter === 'popular') {
      query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    // Check which posts current user liked
    const { data: sessionData } = await sb.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;

    let likedPostIds = new Set<string>();
    if (currentUserId && data && data.length > 0) {
      const postIds = data.map((p: any) => p.id);
      const { data: userLikes } = await sb
        .from('likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', postIds);

      likedPostIds = new Set(userLikes?.map((l: any) => l.post_id) || []);
    }

    let normalizedPosts: CommunityPost[] = (data || []).map((post: any) => {
      const postPaper = post.gate_paper || post.shared_stats?.gate_paper || 'CS';
      return {
        ...post,
        gate_paper: postPaper,
        has_liked: likedPostIds.has(post.id),
      };
    });

    if (paperFilter && paperFilter !== 'all') {
      normalizedPosts = normalizedPosts.filter(p => p.gate_paper === paperFilter);
    }

    return normalizedPosts;
  } catch (err) {
    console.warn('Unable to load community posts (offline or unconfigured):', err);
    return [];
  }
}

export async function createCommunityPost(
  content: string,
  subjectTag?: string | null,
  sharedStats?: any,
  gatePaper: string = 'CS'
): Promise<CommunityPost | null> {
  try {
    const sb = getSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    // Store gate_paper in shared_stats to remain backwards-compatible with all Supabase schemas
    const statsPayload = {
      ...(sharedStats || {}),
      gate_paper: gatePaper,
    };

    const insertPayload: any = {
      user_id: userId,
      content: content.trim(),
      subject_tag: subjectTag || null,
      shared_stats: statsPayload,
    };

    const { data, error } = await sb
      .from('posts')
      .insert(insertPayload)
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, display_name, avatar_url, target_gate_year)
      `)
      .single();

    if (error) throw error;
    return {
      ...data,
      gate_paper: (data as any).gate_paper || statsPayload.gate_paper || 'CS',
    } as CommunityPost;
  } catch (err) {
    console.error('Error creating post:', err);
    return null;
  }
}

export async function deleteCommunityPost(postId: string): Promise<boolean> {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('posts').delete().eq('id', postId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting post:', err);
    return false;
  }
}

export async function togglePostLike(postId: string, currentlyLiked: boolean): Promise<boolean> {
  try {
    const sb = getSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return false;

    if (currentlyLiked) {
      // Remove like
      await sb.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
      await sb.rpc('decrement_post_likes', { post_id_param: postId }).catch(() => {
        // Fallback update
        sb.from('posts').update({ likes_count: sb.rpc('greatest', [0]) }).eq('id', postId);
      });
    } else {
      // Add like
      await sb.from('likes').insert({ post_id: postId, user_id: userId });
      await sb.rpc('increment_post_likes', { post_id_param: postId }).catch(() => {});
    }
    return true;
  } catch (err) {
    console.error('Error toggling like:', err);
    return false;
  }
}

// ==========================================
// COMMENTS
// ==========================================

export async function fetchPostComments(postId: string): Promise<PostComment[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('comments')
      .select(`
        *,
        author:profiles(id, username, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as PostComment[];
  } catch (err) {
    console.error('Error fetching comments:', err);
    return [];
  }
}

export async function createPostComment(postId: string, content: string): Promise<PostComment | null> {
  try {
    const sb = getSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return null;

    const { data, error } = await sb
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
      })
      .select(`
        *,
        author:profiles(id, username, display_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data as PostComment;
  } catch (err) {
    console.error('Error creating comment:', err);
    return null;
  }
}

export async function deletePostComment(commentId: string): Promise<boolean> {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('comments').delete().eq('id', commentId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting comment:', err);
    return false;
  }
}

// ==========================================
// MODERATION & REPORTS
// ==========================================

export async function reportContent(data: { postId?: string; commentId?: string; reportedUserId?: string; reason: string }): Promise<boolean> {
  try {
    const sb = getSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const reporterId = sessionData?.session?.user?.id;
    if (!reporterId) return false;

    const { error } = await sb.from('reports').insert({
      reporter_id: reporterId,
      post_id: data.postId || null,
      comment_id: data.commentId || null,
      reported_user_id: data.reportedUserId || null,
      reason: data.reason,
    });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error submitting report:', err);
    return false;
  }
}

export async function blockUser(blockedId: string): Promise<boolean> {
  try {
    const sb = getSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const blockerId = sessionData?.session?.user?.id;
    if (!blockerId) return false;

    const { error } = await sb.from('blocked_users').insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error blocking user:', err);
    return false;
  }
}

// ==========================================
// USER SEARCH & PEOPLE
// ==========================================

export interface FriendRequestResult {
  success: boolean;
  action: 'sent' | 'accepted' | 'already_sent' | 'already_friends';
  error?: string;
}

function normalizeUserProfile(raw: any, privacyRaw?: any, progressRaw?: any): UserProfile {
  const unwrappedProfile = Array.isArray(raw) ? raw[0] : raw;
  if (!unwrappedProfile) {
    return {
      id: '',
      username: 'user',
      display_name: 'GATE Aspirant',
      gate_paper: 'CS',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const pRaw = privacyRaw !== undefined ? privacyRaw : unwrappedProfile.privacy;
  const progRaw = progressRaw !== undefined ? progressRaw : unwrappedProfile.progress;

  const pObj = Array.isArray(pRaw) ? pRaw[0] : pRaw;
  const progObj = Array.isArray(progRaw) ? progRaw[0] : progRaw;

  const effectivePrivacy: PrivacySettings = {
    user_id: unwrappedProfile.id,
    share_profile: pObj?.share_profile ?? true,
    share_calendar: pObj?.share_calendar ?? true,
    share_study_hours: pObj?.share_study_hours ?? true,
    share_question_stats: pObj?.share_question_stats ?? true,
    share_syllabus_progress: pObj?.share_syllabus_progress ?? true,
    share_mock_performance: pObj?.share_mock_performance ?? false,
    share_subject_progress: pObj?.share_subject_progress ?? true,
    visibility: pObj?.visibility || 'public',
  };

  const isPublic = effectivePrivacy.share_profile;

  return {
    ...unwrappedProfile,
    gate_paper: unwrappedProfile.gate_paper || 'CS',
    privacy: effectivePrivacy,
    progress: isPublic ? (progObj || undefined) : undefined,
  };
}

export async function searchUsers(query: string = ''): Promise<UserProfile[]> {
  try {
    const sb = getSupabase();
    let q = sb
      .from('profiles')
      .select(`
        *,
        privacy:privacy_settings(*),
        progress:shared_progress(*)
      `)
      .order('updated_at', { ascending: false })
      .limit(30);

    const trimmed = query.trim();
    if (trimmed) {
      q = q.or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`);
    }

    const { data, error } = await q;
    if (error) throw error;

    return (data || []).map((p: any) => normalizeUserProfile(p, p.privacy, p.progress));
  } catch (err) {
    console.warn('User search error:', err);
    return [];
  }
}

// ==========================================
// FRIENDSHIPS
// ==========================================

export async function fetchFriends(userId: string): Promise<Friendship[]> {
  try {
    const sb = getSupabase();
    // 1. Fetch accepted friendships
    const { data: friendships, error: friendErr } = await sb
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });

    if (friendErr) throw friendErr;
    if (!friendships || friendships.length === 0) return [];

    // 2. Extract friend user IDs
    const friendUserIds = Array.from(new Set(
      friendships.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id).filter(Boolean)
    ));

    if (friendUserIds.length === 0) return [];

    // 3. Batch fetch profiles, privacy, and shared progress for all friends
    const { data: profiles } = await sb
      .from('profiles')
      .select(`
        *,
        privacy:privacy_settings(*),
        progress:shared_progress(*)
      `)
      .in('id', friendUserIds);

    const profileMap = new Map<string, UserProfile>();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.id, normalizeUserProfile(p, p.privacy, p.progress));
    });

    return friendships.map(f => {
      const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      return {
        ...f,
        friend_profile: profileMap.get(friendId) || {
          id: friendId,
          username: 'user',
          display_name: 'Friend',
          gate_paper: 'CS',
          created_at: f.created_at,
          updated_at: f.updated_at,
        },
      };
    });
  } catch (err) {
    console.error('Error fetching friends:', err);
    return [];
  }
}

export async function fetchPendingFriendRequests(userId: string): Promise<{ incoming: Friendship[]; outgoing: Friendship[] }> {
  try {
    const sb = getSupabase();
    // 1. Fetch pending friendships
    const { data: friendships, error: reqErr } = await sb
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (reqErr) throw reqErr;
    if (!friendships || friendships.length === 0) return { incoming: [], outgoing: [] };

    // 2. Extract involved other user IDs
    const otherUserIds = Array.from(new Set(
      friendships.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id).filter(Boolean)
    ));

    // 3. Batch fetch profiles, privacy, and shared progress
    const { data: profiles } = await sb
      .from('profiles')
      .select(`
        *,
        privacy:privacy_settings(*),
        progress:shared_progress(*)
      `)
      .in('id', otherUserIds);

    const profileMap = new Map<string, UserProfile>();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.id, normalizeUserProfile(p, p.privacy, p.progress));
    });

    const incoming: Friendship[] = [];
    const outgoing: Friendship[] = [];

    friendships.forEach(f => {
      const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      const friendProfile = profileMap.get(otherId) || {
        id: otherId,
        username: 'user',
        display_name: 'GATE Aspirant',
        gate_paper: 'CS',
        created_at: f.created_at,
        updated_at: f.updated_at,
      };

      const enriched: Friendship = {
        ...f,
        friend_profile: friendProfile,
      };

      if (f.addressee_id === userId) {
        incoming.push(enriched);
      } else {
        outgoing.push(enriched);
      }
    });

    return { incoming, outgoing };
  } catch (err) {
    console.error('Error fetching friend requests:', err);
    return { incoming: [], outgoing: [] };
  }
}

export async function sendFriendRequest(targetUserId: string): Promise<FriendRequestResult> {
  try {
    const sb = getSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return { success: false, action: 'sent', error: 'Please sign in to add friends' };
    if (userId === targetUserId) return { success: false, action: 'sent', error: 'You cannot add yourself as a friend' };

    // Check for existing friendship record in either direction
    const { data: existingRecords, error: searchErr } = await sb
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${userId})`);

    if (searchErr) {
      console.warn('Friendship existing check warning:', searchErr);
    }

    const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    if (existing) {
      // 1. If already friends
      if (existing.status === 'accepted') {
        return { success: true, action: 'already_friends' };
      }

      // 2. If the friend already sent a pending request to YOU, automatically accept it!
      if (existing.requester_id === targetUserId && existing.addressee_id === userId) {
        const { error: acceptErr } = await sb
          .from('friendships')
          .update({
            status: 'accepted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (acceptErr) throw acceptErr;
        return { success: true, action: 'accepted' };
      }

      // 3. If you already sent a pending request to them
      if (existing.requester_id === userId && existing.addressee_id === targetUserId && existing.status === 'pending') {
        return { success: true, action: 'already_sent' };
      }

      // 4. If previously rejected, blocked, or deleted, update and reactivate as pending request
      const { error: updateErr } = await sb
        .from('friendships')
        .update({
          requester_id: userId,
          addressee_id: targetUserId,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateErr) throw updateErr;
      return { success: true, action: 'sent' };
    }

    // No existing record — insert a clean new pending request
    const { error: insertErr } = await sb.from('friendships').insert({
      requester_id: userId,
      addressee_id: targetUserId,
      status: 'pending',
    });

    if (insertErr) {
      // Fallback: If duplicate key hit due to concurrent request, check again and accept/confirm
      const { data: retryCheck } = await sb
        .from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${userId})`)
        .maybeSingle();

      if (retryCheck) {
        if (retryCheck.requester_id === targetUserId) {
          await sb.from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', retryCheck.id);
          return { success: true, action: 'accepted' };
        }
        return { success: true, action: 'already_sent' };
      }
      throw insertErr;
    }

    return { success: true, action: 'sent' };
  } catch (err: any) {
    console.error('Error sending friend request:', err);
    return {
      success: false,
      action: 'sent',
      error: err?.message || 'Failed to send request',
    };
  }
}

export async function respondFriendRequest(friendshipId: string, accept: boolean): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (accept) {
      const { error } = await sb
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);
      if (error) throw error;
    } else {
      const { error } = await sb.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error('Error responding to friend request:', err);
    return false;
  }
}

export async function removeFriend(friendshipId: string): Promise<boolean> {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('friendships').delete().eq('id', friendshipId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error removing friend:', err);
    return false;
  }
}

// ==========================================
// SHARED STUDY CALENDAR
// ==========================================

export async function fetchSharedCalendar(targetUserId: string): Promise<SharedCalendarDay[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('shared_calendar')
      .select('date, study_hours, studied')
      .eq('user_id', targetUserId)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []) as SharedCalendarDay[];
  } catch (err) {
    console.error('Error fetching shared calendar:', err);
    return [];
  }
}
