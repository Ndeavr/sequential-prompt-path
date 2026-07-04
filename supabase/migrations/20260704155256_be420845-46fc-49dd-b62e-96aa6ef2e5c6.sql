
-- Phase 1: schema additions
ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS acquisition_priority_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_type text,
  ADD COLUMN IF NOT EXISTS has_mobile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_landline boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_quality text,
  ADD COLUMN IF NOT EXISTS aggregator_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_website boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_quality_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_area_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outreach_channel text,
  ADD COLUMN IF NOT EXISTS outreach_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suppression_reason text,
  ADD COLUMN IF NOT EXISTS priority_recomputed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cp_eligible_score
  ON public.contractor_prospects (outreach_eligible, acquisition_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_cp_phone_type ON public.contractor_prospects (phone_type);
CREATE INDEX IF NOT EXISTS idx_cp_aggregator ON public.contractor_prospects (aggregator_email);
CREATE INDEX IF NOT EXISTS idx_cp_suppression ON public.contractor_prospects (suppression_reason);
CREATE INDEX IF NOT EXISTS idx_cp_recomputed ON public.contractor_prospects (priority_recomputed_at NULLS FIRST);

-- Suppression domain list (aggregators / lead-sellers)
CREATE TABLE IF NOT EXISTS public.acquisition_suppression_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'aggregator',
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_suppression_domains TO authenticated;
GRANT ALL ON public.acquisition_suppression_domains TO service_role;

ALTER TABLE public.acquisition_suppression_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage suppression domains" ON public.acquisition_suppression_domains;
CREATE POLICY "Admins manage suppression domains"
  ON public.acquisition_suppression_domains
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_suppression_touch ON public.acquisition_suppression_domains;
CREATE TRIGGER trg_suppression_touch BEFORE UPDATE ON public.acquisition_suppression_domains
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

INSERT INTO public.acquisition_suppression_domains (domain, kind, notes) VALUES
  ('renoassistance.ca',      'aggregator', 'Lead-selling platform'),
  ('soumissionrenovation.com','aggregator','Lead-selling platform'),
  ('soumissionsmaison.com',  'aggregator', 'Lead-selling platform'),
  ('bark.com',               'aggregator', 'Lead-selling platform'),
  ('bark.co.uk',             'aggregator', 'Lead-selling platform'),
  ('homestars.com',          'aggregator', 'Lead-selling platform'),
  ('trustedpros.ca',         'aggregator', 'Lead-selling platform'),
  ('renovationfind.com',     'aggregator', 'Lead-selling platform'),
  ('renovationquotes.com',   'aggregator', 'Lead-selling platform')
ON CONFLICT (domain) DO NOTHING;

-- Queue tier view
CREATE OR REPLACE VIEW public.v_acquisition_queues
WITH (security_invoker = true) AS
SELECT
  cp.*,
  CASE
    WHEN cp.acquisition_priority_score >= 90 THEN 'A_ready'
    WHEN cp.acquisition_priority_score >= 75 THEN 'B_high'
    WHEN cp.acquisition_priority_score >= 50 THEN 'C_medium'
    ELSE 'D_ignore'
  END AS queue_tier
FROM public.contractor_prospects cp;

GRANT SELECT ON public.v_acquisition_queues TO authenticated;
GRANT ALL ON public.v_acquisition_queues TO service_role;

-- KPI summary RPC
CREATE OR REPLACE FUNCTION public.rpc_acquisition_intelligence_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total',              (SELECT count(*) FROM public.contractor_prospects),
    'eligible',           (SELECT count(*) FROM public.contractor_prospects WHERE outreach_eligible),
    'suppressed',         (SELECT count(*) FROM public.contractor_prospects WHERE suppression_reason IS NOT NULL),
    'aggregator_emails',  (SELECT count(*) FROM public.contractor_prospects WHERE aggregator_email),
    'mobile_numbers',     (SELECT count(*) FROM public.contractor_prospects WHERE has_mobile),
    'landlines',          (SELECT count(*) FROM public.contractor_prospects WHERE has_landline),
    'no_website',         (SELECT count(*) FROM public.contractor_prospects WHERE NOT has_website),
    'reviews_25_plus',    (SELECT count(*) FROM public.contractor_prospects WHERE coalesce(review_count,0) >= 25),
    'ready_to_activate',  (SELECT count(*) FROM public.contractor_prospects WHERE outreach_eligible AND acquisition_priority_score >= 90),
    'queue_a',            (SELECT count(*) FROM public.contractor_prospects WHERE outreach_eligible AND acquisition_priority_score >= 90),
    'queue_b',            (SELECT count(*) FROM public.contractor_prospects WHERE outreach_eligible AND acquisition_priority_score BETWEEN 75 AND 89),
    'queue_c',            (SELECT count(*) FROM public.contractor_prospects WHERE outreach_eligible AND acquisition_priority_score BETWEEN 50 AND 74),
    'queue_d',            (SELECT count(*) FROM public.contractor_prospects WHERE acquisition_priority_score < 50 OR NOT outreach_eligible)
  );
$$;

REVOKE ALL ON FUNCTION public.rpc_acquisition_intelligence_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_acquisition_intelligence_summary() TO authenticated, service_role;
