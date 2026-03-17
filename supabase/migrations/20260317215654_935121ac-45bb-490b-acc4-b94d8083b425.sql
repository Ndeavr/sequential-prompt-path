
-- User likes/favorites table
CREATE TABLE public.user_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('design_image', 'project', 'contractor', 'blog_article')),
  entity_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

-- User shares tracking
CREATE TABLE public.user_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  entity_type text NOT NULL CHECK (entity_type IN ('design_image', 'project', 'contractor', 'blog_article')),
  entity_id text NOT NULL,
  share_method text NOT NULL DEFAULT 'link',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_likes_user ON public.user_likes(user_id);
CREATE INDEX idx_user_likes_entity ON public.user_likes(entity_type, entity_id);
CREATE INDEX idx_user_shares_entity ON public.user_shares(entity_type, entity_id);

-- Like counts view (materialized-like performance via index)
CREATE INDEX idx_user_likes_count ON public.user_likes(entity_type, entity_id);

-- RLS
ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shares ENABLE ROW LEVEL SECURITY;

-- Likes: users can see all likes (for counts), insert/delete own
CREATE POLICY "Anyone can view likes" ON public.user_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.user_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike own" ON public.user_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Shares: insert for anyone (anonymous tracking ok), select own
CREATE POLICY "Anyone can create shares" ON public.user_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own shares" ON public.user_shares FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
