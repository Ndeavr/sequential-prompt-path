
-- Article engagement tables

CREATE TABLE public.article_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.seo_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(article_id, user_id),
  UNIQUE(article_id, session_id)
);

CREATE TABLE public.article_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.seo_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  share_channel TEXT NOT NULL DEFAULT 'copy_link',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.article_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.seo_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  download_type TEXT NOT NULL DEFAULT 'pdf',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_article_likes_article ON public.article_likes(article_id);
CREATE INDEX idx_article_shares_article ON public.article_shares(article_id);
CREATE INDEX idx_article_downloads_article ON public.article_downloads(article_id);

-- Enable RLS
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_downloads ENABLE ROW LEVEL SECURITY;

-- Likes policies
CREATE POLICY "Anyone can view likes" ON public.article_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.article_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anonymous can like" ON public.article_likes FOR INSERT TO anon WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);
CREATE POLICY "Users can unlike" ON public.article_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Shares policies
CREATE POLICY "Anyone can view shares" ON public.article_shares FOR SELECT USING (true);
CREATE POLICY "Authenticated users can share" ON public.article_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anonymous can share" ON public.article_shares FOR INSERT TO anon WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

-- Downloads policies
CREATE POLICY "Anyone can view downloads" ON public.article_downloads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can download" ON public.article_downloads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anonymous can download" ON public.article_downloads FOR INSERT TO anon WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);
