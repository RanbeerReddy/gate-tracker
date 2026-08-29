-- ==============================================================================
-- GATE TRACKER: CLOUD SOCIAL & COMMUNITY SCHEMA (SUPABASE / POSTGRESQL)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    target_gate_year INTEGER,
    target_score NUMERIC(5,2),
    gate_paper TEXT DEFAULT 'CS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30)
);

-- 2. PRIVACY SETTINGS TABLE (Defaults to active sharing for connected features)
CREATE TABLE IF NOT EXISTS public.privacy_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    share_profile BOOLEAN DEFAULT true,
    share_calendar BOOLEAN DEFAULT true,
    share_study_hours BOOLEAN DEFAULT true,
    share_question_stats BOOLEAN DEFAULT true,
    share_syllabus_progress BOOLEAN DEFAULT true,
    share_mock_performance BOOLEAN DEFAULT false,
    share_subject_progress BOOLEAN DEFAULT true,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SHARED AGGREGATE PROGRESS (Derived, sanitized metrics only - zero private notes)
CREATE TABLE IF NOT EXISTS public.shared_progress (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_study_hours NUMERIC(7,2) DEFAULT 0,
    days_studied INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    questions_solved INTEGER DEFAULT 0,
    overall_accuracy NUMERIC(5,2) DEFAULT 0,
    syllabus_completion NUMERIC(5,2) DEFAULT 0,
    gate_paper TEXT DEFAULT 'CS',
    subject_progress JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SHARED STUDY CALENDAR (Sanitized daily hours only - zero session notes or question details)
CREATE TABLE IF NOT EXISTS public.shared_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    study_hours NUMERIC(4,2) NOT NULL DEFAULT 0,
    studied BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 5. COMMUNITY POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    subject_tag TEXT,
    gate_paper TEXT DEFAULT 'CS',
    shared_stats JSONB,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. LIKES TABLE (Prevents duplicate likes from the same user)
CREATE TABLE IF NOT EXISTS public.likes (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- 8. FRIENDSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id),
    CONSTRAINT different_users CHECK (requester_id <> addressee_id)
);

-- 9. REPORTS / MODERATION TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BLOCKED USERS TABLE
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes ON public.posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_shared_calendar_user ON public.shared_calendar(user_id, date);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON public.friendships(requester_id, addressee_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, user can update own profile
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Privacy Settings: Public read for permissions evaluation, user can update own settings
CREATE POLICY "Privacy settings are viewable by everyone" ON public.privacy_settings
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own privacy settings" ON public.privacy_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings" ON public.privacy_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Shared Progress: Viewable if owner enabled sharing or if owner
CREATE POLICY "View shared progress if permitted" ON public.shared_progress
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.privacy_settings ps
            WHERE ps.user_id = shared_progress.user_id
            AND (
                ps.share_profile = true OR
                ps.share_study_hours = true OR
                ps.share_question_stats = true OR
                ps.share_syllabus_progress = true
            )
        )
    );

CREATE POLICY "Users can insert/update own shared progress" ON public.shared_progress
    FOR ALL USING (auth.uid() = user_id);

-- Shared Calendar: Viewable if owner enabled calendar sharing
CREATE POLICY "View shared calendar if permitted" ON public.shared_calendar
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.privacy_settings ps
            WHERE ps.user_id = shared_calendar.user_id
            AND ps.share_calendar = true
        )
    );

CREATE POLICY "Users can insert/update own shared calendar" ON public.shared_calendar
    FOR ALL USING (auth.uid() = user_id);

-- Posts: Viewable by everyone except blocked, author can modify/delete
CREATE POLICY "Posts viewable by everyone" ON public.posts
    FOR SELECT USING (
        NOT EXISTS (
            SELECT 1 FROM public.blocked_users b
            WHERE b.blocker_id = auth.uid() AND b.blocked_id = posts.user_id
        )
    );

CREATE POLICY "Authenticated users can create posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Comments: Viewable by everyone, authenticated users can comment, author can delete
CREATE POLICY "Comments viewable by everyone" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Likes: Viewable by everyone, user can like and unlike
CREATE POLICY "Likes viewable by everyone" ON public.likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can toggle like" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own like" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- Friendships: Users can view and manage their own friendships
CREATE POLICY "Users can view own friendships" ON public.friendships
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friend requests" ON public.friendships
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update received or sent requests" ON public.friendships
    FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete friendship" ON public.friendships
    FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Reports: Authenticated users can insert reports
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Blocked Users: Users can manage their block list
CREATE POLICY "Users can view own blocklist" ON public.blocked_users
    FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block other users" ON public.blocked_users
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock" ON public.blocked_users
    FOR DELETE USING (auth.uid() = blocker_id);

-- ==============================================================================
-- AUTOMATIC PROFILE & PRIVACY CREATION TRIGGER (On auth.users insert)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url, target_gate_year)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'GATE Aspirant'),
        NEW.raw_user_meta_data->>'avatar_url',
        (NEW.raw_user_meta_data->>'target_gate_year')::integer
    );

    INSERT INTO public.privacy_settings (user_id)
    VALUES (NEW.id);

    INSERT INTO public.shared_progress (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
