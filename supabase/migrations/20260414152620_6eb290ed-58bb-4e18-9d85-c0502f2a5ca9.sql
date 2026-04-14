
-- Table: visibility_scores — AI visibility scoring per company/prospect
CREATE TABLE public.visibility_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES public.contractors_prospects(id) ON DELETE SET NULL,
  score_total NUMERIC NOT NULL DEFAULT 0,
  score_ai_search NUMERIC DEFAULT 0,
  score_local_presence NUMERIC DEFAULT 0,
  score_reviews NUMERIC DEFAULT 0,
  score_schema NUMERIC DEFAULT 0,
  score_content NUMERIC DEFAULT 0,
  score_conversion NUMERIC DEFAULT 0,
  score_trust NUMERIC DEFAULT 0,
  summary_short TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visibility_scores_company ON public.visibility_scores(company_id);
CREATE INDEX idx_visibility_scores_prospect ON public.visibility_scores(prospect_id);

ALTER TABLE public.visibility_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on visibility_scores"
  ON public.visibility_scores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table: outbound_approvals — admin approval gate for prospects entering campaigns
CREATE TABLE public.outbound_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.outbound_campaigns(id) ON DELETE SET NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending_approval',
  correction_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbound_approvals_prospect ON public.outbound_approvals(prospect_id);
CREATE INDEX idx_outbound_approvals_status ON public.outbound_approvals(approval_status);

ALTER TABLE public.outbound_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on outbound_approvals"
  ON public.outbound_approvals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RPC: approve_prospect — approve a prospect for outbound campaigns
CREATE OR REPLACE FUNCTION public.approve_prospect(
  _prospect_id UUID,
  _campaign_id UUID DEFAULT NULL,
  _actor_id UUID DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.outbound_approvals (prospect_id, campaign_id, approval_status, approved_by, approved_at)
  VALUES (_prospect_id, _campaign_id, 'approved', _actor_id, now())
  ON CONFLICT (prospect_id) WHERE campaign_id IS NOT DISTINCT FROM _campaign_id
  DO UPDATE SET approval_status = 'approved', approved_by = _actor_id, approved_at = now(), updated_at = now();
  
  UPDATE public.contractors_prospects SET status = 'approved' WHERE id = _prospect_id;
END;
$$;

-- RPC: reject_prospect
CREATE OR REPLACE FUNCTION public.reject_prospect(
  _prospect_id UUID,
  _actor_id UUID DEFAULT NULL,
  _notes TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.outbound_approvals (prospect_id, approval_status, approved_by, approved_at, correction_notes)
  VALUES (_prospect_id, 'rejected', _actor_id, now(), _notes)
  ON CONFLICT (prospect_id) WHERE campaign_id IS NULL
  DO UPDATE SET approval_status = 'rejected', approved_by = _actor_id, approved_at = now(), correction_notes = _notes, updated_at = now();
  
  UPDATE public.contractors_prospects SET status = 'rejected' WHERE id = _prospect_id;
END;
$$;
