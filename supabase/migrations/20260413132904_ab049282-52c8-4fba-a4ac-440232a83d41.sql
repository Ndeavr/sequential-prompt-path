
-- project_requests
CREATE TABLE IF NOT EXISTS public.project_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address_id uuid NULL,
  intent text,
  raw_conversation jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own requests" ON public.project_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own requests" ON public.project_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own requests" ON public.project_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- contractor_matches (before handoff so RLS can reference it)
CREATE TABLE IF NOT EXISTS public.contractor_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.project_requests(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  match_score numeric NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  notified_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors view own matches" ON public.contractor_matches FOR SELECT TO authenticated USING (
  contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Contractors update own matches" ON public.contractor_matches FOR UPDATE TO authenticated USING (
  contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "System insert matches" ON public.contractor_matches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- project_handoff
CREATE TABLE IF NOT EXISTS public.project_handoff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.project_requests(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  category text,
  sub_category text,
  urgency_level text NOT NULL DEFAULT 'normal',
  estimated_budget_min integer,
  estimated_budget_max integer,
  estimated_duration text,
  complexity text DEFAULT 'medium',
  client_availability text,
  location_city text,
  location_address text,
  missing_fields jsonb DEFAULT '[]'::jsonb,
  structured_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_handoff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read handoff" ON public.project_handoff FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.project_requests pr WHERE pr.id = request_id AND (pr.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  OR EXISTS (SELECT 1 FROM public.contractor_matches cm WHERE cm.request_id = project_handoff.request_id AND cm.contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()))
);
CREATE POLICY "System insert handoff" ON public.project_handoff FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System update handoff" ON public.project_handoff FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- lead_scores
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.project_requests(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  label text NOT NULL DEFAULT 'LOW',
  scoring_breakdown jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read scores" ON public.lead_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert scores" ON public.lead_scores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- job_status_logs
CREATE TABLE IF NOT EXISTS public.job_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.project_requests(id) ON DELETE CASCADE,
  status text NOT NULL,
  actor text NOT NULL DEFAULT 'system',
  actor_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_status_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read logs" ON public.job_status_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert logs" ON public.job_status_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_project_requests_user ON public.project_requests(user_id);
CREATE INDEX idx_project_requests_status ON public.project_requests(status);
CREATE INDEX idx_project_handoff_request ON public.project_handoff(request_id);
CREATE INDEX idx_lead_scores_request ON public.lead_scores(request_id);
CREATE INDEX idx_contractor_matches_request ON public.contractor_matches(request_id);
CREATE INDEX idx_contractor_matches_contractor ON public.contractor_matches(contractor_id);
CREATE INDEX idx_contractor_matches_status ON public.contractor_matches(status);
CREATE INDEX idx_job_status_logs_request ON public.job_status_logs(request_id);

-- Triggers
CREATE TRIGGER set_project_requests_updated_at BEFORE UPDATE ON public.project_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_project_handoff_updated_at BEFORE UPDATE ON public.project_handoff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_contractor_matches_updated_at BEFORE UPDATE ON public.contractor_matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
