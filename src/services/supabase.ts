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

// Supabase project configuration from environment variables
const SUPABASE_URL =
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://gate-tracker-social.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_offline_resilience';

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

// ==========================================
// AUTHENTICATION & PROFILES
// ==========================================

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('profiles')
      .select('id')
      .ilike('username', username.trim())
      .maybeSingle();

    if (error) throw error;
    return !data;
  } catch (err) {
    console.warn('Username check fallback:', err);
    return true;
  }
}

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
    const { error } = await sb
      .from('profiles')
      .update({
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        bio: data.bio,
        target_gate_year: data.target_gate_year,
        target_score: data.target_score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
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

export async function fetchCommunityPosts(page: number = 0, limit: number = 20, filter: 'latest' | 'popular' = 'latest'): Promise<CommunityPost[]> {
  try {
    const sb = getSupabase();
    let query = sb
      .from('posts')
      .select(`
        *,
        author:profiles(id, username, display_name, avatar_url, target_gate_year)
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

    if (currentUserId && data && data.length > 0) {
      const postIds = data.map((p: any) => p.id);
      const { data: userLikes } = await sb
        .from('likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', postIds);

      const likedPostIds = new Set(userLikes?.map((l: any) => l.post_id) || []);
      return data.map((post: any) => ({
        ...post,
        has_liked: likedPostIds.has(post.id),
      }));
    }

    return (data || []) as CommunityPost[];
  } catch (err) {
    console.warn('Unable to load community posts (offline or unconfigured):', err);
    return [];
  }
}

export async function createCommunityPost(content: string, subjectTag?: string | null, sharedStats?: any): Promise<CommunityPost | null> {
  try {
    const sb = getSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await sb
      .from('posts')
      .insert({
        user_id: userId,
        content: content.trim(),
        subject_tag: subjectTag || null,
        shared_stats: sharedStats || null,
      })
      .select(`
        *,
        author:profiles(id, username, display_name, avatar_url, target_gate_year)
      `)
      .single();

    if (error) throw error;
    return data as CommunityPost;
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

export async function searchUsers(query: string): Promise<UserProfile[]> {
  try {
    if (!query.trim()) return [];
    const sb = getSupabase();

    const { data, error } = await sb
      .from('profiles')
      .select(`
        *,
        privacy:privacy_settings(*),
        progress:shared_progress(*)
      `)
      .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
      .limit(20);

    if (error) throw error;

    return (data || []).map((p: any) => {
      const isPublic = p.privacy?.share_profile ?? false;
      return {
        ...p,
        privacy: p.privacy,
        progress: isPublic ? p.progress : undefined,
      };
    });
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
    const { data, error } = await sb
      .from('friendships')
      .select(`
        *,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url, target_gate_year),
        addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url, target_gate_year)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;

    return (data || []).map((f: any) => ({
      ...f,
      friend_profile: f.requester_id === userId ? f.addressee : f.requester,
    }));
  } catch (err) {
    console.error('Error fetching friends:', err);
    return [];
  }
}

export async function fetchPendingFriendRequests(userId: string): Promise<{ incoming: Friendship[]; outgoing: Friendship[] }> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('friendships')
      .select(`
        *,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url, target_gate_year),
        addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url, target_gate_year)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'pending');

    if (error) throw error;

    const incoming = (data || [])
      .filter((f: any) => f.addressee_id === userId)
      .map((f: any) => ({ ...f, friend_profile: f.requester }));

    const outgoing = (data || [])
      .filter((f: any) => f.requester_id === userId)
      .map((f: any) => ({ ...f, friend_profile: f.addressee }));

    return { incoming, outgoing };
  } catch (err) {
    console.error('Error fetching friend requests:', err);
    return { incoming: [], outgoing: [] };
  }
}

export async function sendFriendRequest(targetUserId: string): Promise<boolean> {
  try {
    const sb = getSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId || userId === targetUserId) return false;

    const { error } = await sb.from('friendships').insert({
      requester_id: userId,
      addressee_id: targetUserId,
      status: 'pending',
    });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error sending friend request:', err);
    return false;
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
