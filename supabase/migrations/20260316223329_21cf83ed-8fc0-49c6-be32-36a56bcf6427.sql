
-- UNPRO Design Module Tables
-- ===========================

-- 1. design_projects
CREATE TABLE public.design_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Mon projet design',
  room_type text,
  original_image_url text,
  visibility text NOT NULL DEFAULT 'private',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. design_versions
CREATE TABLE public.design_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  parent_version_id uuid REFERENCES public.design_versions(id) ON DELETE SET NULL,
  version_number text NOT NULL DEFAULT '1',
  image_url text,
  prompt_used text,
  frozen boolean NOT NULL DEFAULT false,
  style_label text,
  budget_mode text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. design_edits
CREATE TABLE public.design_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.design_versions(id) ON DELETE CASCADE,
  edit_type text NOT NULL DEFAULT 'prompt',
  target_zone text,
  prompt text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. design_shares
CREATE TABLE public.design_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  privacy_type text NOT NULL DEFAULT 'private',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. design_votes
CREATE TABLE public.design_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.design_versions(id) ON DELETE CASCADE,
  voter_name text NOT NULL DEFAULT 'Anonyme',
  voter_email text,
  vote_type text NOT NULL DEFAULT 'love',
  comment text,
  fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. design_material_preferences
CREATE TABLE public.design_material_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  cabinets_color text,
  wall_color text,
  countertop_type text,
  backsplash_type text,
  floor_type text,
  hardware_finish text,
  style_tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. project_briefs
CREATE TABLE public.project_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  design_project_id uuid NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  selected_version_id uuid REFERENCES public.design_versions(id) ON DELETE SET NULL,
  brief_json jsonb NOT NULL DEFAULT '{}',
  ready_for_matching boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_design_projects_user ON public.design_projects(user_id);
CREATE INDEX idx_design_versions_project ON public.design_versions(project_id);
CREATE INDEX idx_design_versions_parent ON public.design_versions(parent_version_id);
CREATE INDEX idx_design_edits_version ON public.design_edits(version_id);
CREATE INDEX idx_design_shares_token ON public.design_shares(share_token);
CREATE INDEX idx_design_votes_project ON public.design_votes(project_id);
CREATE INDEX idx_design_votes_version ON public.design_votes(version_id);
CREATE INDEX idx_project_briefs_project ON public.project_briefs(design_project_id);

-- Enable RLS
ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_material_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_briefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- design_projects: owner access + admin
CREATE POLICY "Users manage own design projects" ON public.design_projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- design_versions: through project ownership
CREATE POLICY "Users manage versions of own projects" ON public.design_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND (dp.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND (dp.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- design_edits: through version->project ownership
CREATE POLICY "Users manage edits of own versions" ON public.design_edits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.design_versions dv
      JOIN public.design_projects dp ON dp.id = dv.project_id
      WHERE dv.id = version_id AND (dp.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.design_versions dv
      JOIN public.design_projects dp ON dp.id = dv.project_id
      WHERE dv.id = version_id AND (dp.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- design_shares: owner manages, public can read via token
CREATE POLICY "Users manage own shares" ON public.design_shares
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND (dp.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND (dp.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- Allow anonymous read of shares by token
CREATE POLICY "Public read shares by token" ON public.design_shares
  FOR SELECT TO anon
  USING (true);

-- design_votes: anyone can vote on shared projects
CREATE POLICY "Anyone can vote on shared projects" ON public.design_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.design_shares ds WHERE ds.project_id = design_votes.project_id)
  );

CREATE POLICY "Read votes on shared projects" ON public.design_votes
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.design_shares ds WHERE ds.project_id = design_votes.project_id)
    OR EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND dp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- design_material_preferences: through project ownership
CREATE POLICY "Users manage material prefs" ON public.design_material_preferences
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND (dp.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = project_id AND (dp.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- project_briefs: owner + admin
CREATE POLICY "Users manage own briefs" ON public.project_briefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Public read for design_versions on shared projects (for voting page)
CREATE POLICY "Public read versions of shared projects" ON public.design_versions
  FOR SELECT TO anon
  USING (
    EXISTS (SELECT 1 FROM public.design_shares ds WHERE ds.project_id = design_versions.project_id)
  );

-- Public read for design_projects on shared projects
CREATE POLICY "Public read shared projects" ON public.design_projects
  FOR SELECT TO anon
  USING (
    EXISTS (SELECT 1 FROM public.design_shares ds WHERE ds.project_id = design_projects.id)
  );

-- Updated_at triggers
CREATE TRIGGER update_design_projects_updated_at
  BEFORE UPDATE ON public.design_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_design_material_prefs_updated_at
  BEFORE UPDATE ON public.design_material_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
