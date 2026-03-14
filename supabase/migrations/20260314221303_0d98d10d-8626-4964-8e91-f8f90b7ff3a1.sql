
-- Renovation projects table (stores generated transformation projects)
CREATE TABLE IF NOT EXISTS public.renovation_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  category TEXT NOT NULL,
  city TEXT,
  style TEXT,
  budget TEXT,
  goal TEXT,
  timeline TEXT,
  original_image_url TEXT,
  project_summary TEXT,
  is_public BOOLEAN DEFAULT true,
  slug TEXT UNIQUE,
  vote_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transformation concepts (3 per project)
CREATE TABLE IF NOT EXISTS public.renovation_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.renovation_projects(id) ON DELETE CASCADE NOT NULL,
  concept_type TEXT NOT NULL DEFAULT 'balanced', -- safe, balanced, premium
  image_url TEXT,
  title TEXT,
  description TEXT,
  estimated_budget_min INTEGER,
  estimated_budget_max INTEGER,
  vote_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project votes
CREATE TABLE IF NOT EXISTS public.project_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.renovation_projects(id) ON DELETE CASCADE NOT NULL,
  concept_id UUID REFERENCES public.renovation_concepts(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  voter_fingerprint TEXT, -- anonymous voting via fingerprint
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, voter_fingerprint)
);

-- Project likes
CREATE TABLE IF NOT EXISTS public.project_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.renovation_projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Project saves (bookmarks)
CREATE TABLE IF NOT EXISTS public.project_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.renovation_projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.renovation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renovation_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_saves ENABLE ROW LEVEL SECURITY;

-- RLS: renovation_projects - public read for is_public, owner can CRUD
CREATE POLICY "Public projects are viewable by everyone" ON public.renovation_projects FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own projects" ON public.renovation_projects FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create projects" ON public.renovation_projects FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anon can create projects" ON public.renovation_projects FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "Users can update own projects" ON public.renovation_projects FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS: renovation_concepts - readable if parent project is public
CREATE POLICY "Concepts viewable if project public" ON public.renovation_concepts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.renovation_projects rp WHERE rp.id = project_id AND (rp.is_public = true OR rp.user_id = auth.uid()))
);
CREATE POLICY "Users can insert concepts" ON public.renovation_concepts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.renovation_projects rp WHERE rp.id = project_id AND rp.user_id = auth.uid())
);

-- RLS: project_votes - anyone can vote, viewable by all
CREATE POLICY "Anyone can view votes" ON public.project_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated can vote" ON public.project_votes FOR INSERT TO authenticated WITH CHECK (voter_id = auth.uid());
CREATE POLICY "Anon can vote" ON public.project_votes FOR INSERT TO anon WITH CHECK (voter_id IS NULL AND voter_fingerprint IS NOT NULL);

-- RLS: project_likes
CREATE POLICY "Anyone can view likes" ON public.project_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.project_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unlike" ON public.project_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS: project_saves
CREATE POLICY "Users can view own saves" ON public.project_saves FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can save" ON public.project_saves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unsave" ON public.project_saves FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_renovation_projects_updated_at
  BEFORE UPDATE ON public.renovation_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
