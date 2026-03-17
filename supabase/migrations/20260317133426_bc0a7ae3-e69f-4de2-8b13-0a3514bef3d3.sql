-- Authority Score V2: Real performance-based scoring
CREATE TABLE public.contractor_authority_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  is_current boolean NOT NULL DEFAULT true,
  overall_score integer NOT NULL DEFAULT 0,
  confidence_level numeric(4,2) NOT NULL DEFAULT 0,
  completion_performance integer NOT NULL DEFAULT 0,
  review_quality integer NOT NULL DEFAULT 0,
  matching_precision integer NOT NULL DEFAULT 0,
  learning_reliability integer NOT NULL DEFAULT 0,
  execution_model integer NOT NULL DEFAULT 0,
  subcontract_network integer NOT NULL DEFAULT 0,
  responsiveness integer NOT NULL DEFAULT 0,
  stability integer NOT NULL DEFAULT 0,
  metrics_json jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  tier text DEFAULT 'bronze',
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_authority_scores_contractor ON public.contractor_authority_scores(contractor_id);
CREATE INDEX idx_authority_scores_current ON public.contractor_authority_scores(contractor_id, is_current) WHERE is_current = true;

CREATE TABLE public.contractor_authority_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_category text NOT NULL,
  delta_score integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_authority_events_contractor ON public.contractor_authority_events(contractor_id, created_at DESC);
CREATE INDEX idx_authority_events_type ON public.contractor_authority_events(event_type);

CREATE TABLE public.contractor_match_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  leads_received integer NOT NULL DEFAULT 0,
  leads_accepted integer NOT NULL DEFAULT 0,
  leads_refused_valid integer NOT NULL DEFAULT 0,
  leads_refused_invalid integer NOT NULL DEFAULT 0,
  precision_score numeric(5,2) DEFAULT 0,
  mismatch_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_metrics_contractor ON public.contractor_match_metrics(contractor_id, period_start DESC);

CREATE TABLE public.contractor_subcontract_network (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  partner_contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  collaborations_count integer NOT NULL DEFAULT 0,
  success_rate numeric(5,2) DEFAULT 0,
  partner_rating numeric(3,1) DEFAULT 0,
  last_collaboration_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contractor_id, partner_contractor_id)
);

ALTER TABLE public.contractor_authority_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_authority_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_match_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_subcontract_network ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors read own authority scores"
  ON public.contractor_authority_scores FOR SELECT TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage authority scores"
  ON public.contractor_authority_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors read own authority events"
  ON public.contractor_authority_events FOR SELECT TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage authority events"
  ON public.contractor_authority_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors read own match metrics"
  ON public.contractor_match_metrics FOR SELECT TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage match metrics"
  ON public.contractor_match_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors read own network"
  ON public.contractor_subcontract_network FOR SELECT TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage network"
  ON public.contractor_subcontract_network FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_current_authority_score(_contractor_id uuid, _score_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.contractor_authority_scores
    SET is_current = false
    WHERE contractor_id = _contractor_id AND id != _score_id;
  UPDATE public.contractor_authority_scores
    SET is_current = true
    WHERE id = _score_id AND contractor_id = _contractor_id;
END;
$$;