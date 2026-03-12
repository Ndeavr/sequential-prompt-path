
-- Syndicate Growth Projects table
CREATE TABLE public.syndicate_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id UUID NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  component TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost INTEGER NOT NULL DEFAULT 0,
  estimated_year INTEGER NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'detected',
  remaining_life_years INTEGER,
  risk_score INTEGER DEFAULT 0,
  matched_contractor_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contractor interest in syndicate projects
CREATE TABLE public.syndicate_project_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.syndicate_projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  interest_type TEXT NOT NULL DEFAULT 'expressed',
  estimated_price INTEGER,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, contractor_id)
);

-- RLS
ALTER TABLE public.syndicate_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndicate_project_interests ENABLE ROW LEVEL SECURITY;

-- Syndicate members can view their syndicate's projects
CREATE POLICY "syndicate_members_view_projects"
  ON public.syndicate_projects FOR SELECT TO authenticated
  USING (public.is_syndicate_member(auth.uid(), syndicate_id));

-- Syndicate admins can manage projects
CREATE POLICY "syndicate_admins_manage_projects"
  ON public.syndicate_projects FOR ALL TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Contractors can view projects (for matching)
CREATE POLICY "contractors_view_projects"
  ON public.syndicate_projects FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contractors WHERE user_id = auth.uid()
  ));

-- Contractors can insert their own interest
CREATE POLICY "contractors_express_interest"
  ON public.syndicate_project_interests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contractors WHERE id = contractor_id AND user_id = auth.uid()
  ));

-- Contractors can view their own interests
CREATE POLICY "contractors_view_own_interests"
  ON public.syndicate_project_interests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contractors WHERE id = contractor_id AND user_id = auth.uid()
  ));

-- Syndicate members can view interests on their projects
CREATE POLICY "syndicate_members_view_interests"
  ON public.syndicate_project_interests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.syndicate_projects sp
    WHERE sp.id = project_id
    AND public.is_syndicate_member(auth.uid(), sp.syndicate_id)
  ));

-- Admins full access
CREATE POLICY "admins_full_access_projects"
  ON public.syndicate_projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_full_access_interests"
  ON public.syndicate_project_interests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_syndicate_projects_updated_at
  BEFORE UPDATE ON public.syndicate_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_syndicate_project_interests_updated_at
  BEFORE UPDATE ON public.syndicate_project_interests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
