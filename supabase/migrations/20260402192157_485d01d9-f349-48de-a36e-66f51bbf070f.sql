
-- inspiration_posts
CREATE TABLE public.inspiration_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  room_type TEXT,
  style_tags TEXT[] DEFAULT '{}',
  budget_label TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  before_image_url TEXT,
  after_image_url TEXT,
  cover_image_url TEXT,
  visibility_status TEXT NOT NULL DEFAULT 'public',
  author_user_id UUID,
  votes_count INTEGER NOT NULL DEFAULT 0,
  saves_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inspiration_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public inspirations" ON public.inspiration_posts FOR SELECT USING (visibility_status = 'public');
CREATE POLICY "Authors can manage own posts" ON public.inspiration_posts FOR ALL USING (auth.uid() = author_user_id);

-- inspiration_votes
CREATE TABLE public.inspiration_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  inspiration_post_id UUID NOT NULL REFERENCES public.inspiration_posts(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL DEFAULT 'upvote',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, inspiration_post_id)
);
ALTER TABLE public.inspiration_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own votes" ON public.inspiration_votes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Vote counts are public" ON public.inspiration_votes FOR SELECT USING (true);

-- inspiration_saves
CREATE TABLE public.inspiration_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  inspiration_post_id UUID NOT NULL REFERENCES public.inspiration_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, inspiration_post_id)
);
ALTER TABLE public.inspiration_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saves" ON public.inspiration_saves FOR ALL USING (auth.uid() = user_id);

-- inspiration_versions
CREATE TABLE public.inspiration_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  inspiration_post_id UUID REFERENCES public.inspiration_posts(id) ON DELETE SET NULL,
  generated_image_url TEXT,
  prompt_used TEXT,
  room_type TEXT,
  style_tags TEXT[] DEFAULT '{}',
  budget_label TEXT,
  visibility_status TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inspiration_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own versions" ON public.inspiration_versions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public versions visible to all" ON public.inspiration_versions FOR SELECT USING (visibility_status = 'public');

-- user_project_privacy
CREATE TABLE public.user_project_privacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  inspiration_version_id UUID NOT NULL REFERENCES public.inspiration_versions(id) ON DELETE CASCADE,
  visibility_status TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, inspiration_version_id)
);
ALTER TABLE public.user_project_privacy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own privacy" ON public.user_project_privacy FOR ALL USING (auth.uid() = user_id);

-- inspiration_project_matches
CREATE TABLE public.inspiration_project_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  inspiration_post_id UUID REFERENCES public.inspiration_posts(id) ON DELETE SET NULL,
  inspiration_version_id UUID REFERENCES public.inspiration_versions(id) ON DELETE SET NULL,
  contractor_id UUID,
  match_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inspiration_project_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own matches" ON public.inspiration_project_matches FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_inspiration_posts_room ON public.inspiration_posts(room_type);
CREATE INDEX idx_inspiration_posts_visibility ON public.inspiration_posts(visibility_status);
CREATE INDEX idx_inspiration_votes_post ON public.inspiration_votes(inspiration_post_id);
CREATE INDEX idx_inspiration_saves_post ON public.inspiration_saves(inspiration_post_id);
CREATE INDEX idx_inspiration_versions_user ON public.inspiration_versions(user_id);
