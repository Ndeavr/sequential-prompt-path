
-- 1. Extend verified_contractor_prospects with tiered eligibility
ALTER TABLE public.verified_contractor_prospects
  ADD COLUMN IF NOT EXISTS sms_eligibility_tier text
    CHECK (sms_eligibility_tier IS NULL OR sms_eligibility_tier IN ('A','B','C','D')),
  ADD COLUMN IF NOT EXISTS sms_eligibility_confidence text
    CHECK (sms_eligibility_confidence IS NULL OR sms_eligibility_confidence IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS eligibility_reason text;

CREATE OR REPLACE FUNCTION public.compute_sms_eligibility_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone_e164 IS NULL THEN
    NEW.sms_eligibility_tier := NULL;
    NEW.sms_eligibility_confidence := 'low';
    NEW.eligibility_reason := 'no_phone';
  ELSIF NEW.phone_line_type = 'mobile' OR NEW.phone_validation_status = 'valid_mobile' THEN
    NEW.sms_eligibility_tier := 'A';
    NEW.sms_eligibility_confidence := 'high';
    NEW.eligibility_reason := 'mobile_line';
  ELSIF NEW.phone_line_type IN ('voip','nonFixedVoip') OR NEW.phone_validation_status = 'valid_sms_capable_voip' THEN
    NEW.sms_eligibility_tier := 'B';
    NEW.sms_eligibility_confidence := 'high';
    NEW.eligibility_reason := 'voip_sms_capable';
  ELSIF NEW.verification_status = 'verified'
        AND COALESCE(NEW.data_quality_score,0) >= 80
        AND NEW.website_url IS NOT NULL
        AND (NEW.phone_source_url IS NOT NULL OR NEW.email IS NOT NULL)
        AND COALESCE(NEW.phone_line_type,'unknown') IN ('unknown')
        AND NEW.phone_validation_status NOT IN ('landline','invalid','disconnected') THEN
    NEW.sms_eligibility_tier := 'C';
    NEW.sms_eligibility_confidence := 'high';
    NEW.eligibility_reason := 'verified_unknown_line_quality_80_plus';
  ELSIF NEW.phone_line_type = 'landline' OR NEW.phone_validation_status = 'landline' THEN
    NEW.sms_eligibility_tier := 'D';
    NEW.sms_eligibility_confidence := 'high';
    NEW.eligibility_reason := 'landline_email_only';
  ELSE
    NEW.sms_eligibility_tier := NULL;
    NEW.sms_eligibility_confidence := 'low';
    NEW.eligibility_reason := 'insufficient_data';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_compute_sms_tier ON public.verified_contractor_prospects;
CREATE TRIGGER trg_compute_sms_tier
  BEFORE INSERT OR UPDATE OF phone_e164, phone_line_type, phone_validation_status, verification_status, data_quality_score, website_url, phone_source_url, email
  ON public.verified_contractor_prospects
  FOR EACH ROW EXECUTE FUNCTION public.compute_sms_eligibility_tier();

-- Backfill existing rows
UPDATE public.verified_contractor_prospects SET updated_at = now() WHERE sms_eligibility_tier IS NULL;

CREATE INDEX IF NOT EXISTS verified_prospects_tier_idx
  ON public.verified_contractor_prospects(sms_eligibility_tier, outreach_status, data_quality_score DESC);

-- 2. acquisition_queue
CREATE TABLE IF NOT EXISTS public.acquisition_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.verified_contractor_prospects(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'new'
    CHECK (state IN ('new','verified','ready_sms','ready_email','contacted','delivered','clicked','activated','failed','skipped')),
  channel text CHECK (channel IS NULL OR channel IN ('sms','email','landing')),
  next_action_at timestamptz NOT NULL DEFAULT now(),
  attempt_count int NOT NULL DEFAULT 0,
  last_error text,
  experiment_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_queue TO authenticated;
GRANT ALL ON public.acquisition_queue TO service_role;
ALTER TABLE public.acquisition_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage acquisition_queue" ON public.acquisition_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS acquisition_queue_state_idx ON public.acquisition_queue(state, next_action_at);
CREATE UNIQUE INDEX IF NOT EXISTS acquisition_queue_prospect_uk ON public.acquisition_queue(prospect_id);

-- 3. acquisition_repair_log
CREATE TABLE IF NOT EXISTS public.acquisition_repair_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.verified_contractor_prospects(id) ON DELETE CASCADE,
  step text NOT NULL,
  error text,
  root_cause text,
  repair_attempt int NOT NULL DEFAULT 1,
  repair_result text CHECK (repair_result IS NULL OR repair_result IN ('recovered','failed','escalated','skipped')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.acquisition_repair_log TO authenticated;
GRANT ALL ON public.acquisition_repair_log TO service_role;
ALTER TABLE public.acquisition_repair_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read repair_log" ON public.acquisition_repair_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "service inserts repair_log" ON public.acquisition_repair_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX IF NOT EXISTS repair_log_prospect_idx ON public.acquisition_repair_log(prospect_id, created_at DESC);

-- 4. outreach_experiments
CREATE TABLE IF NOT EXISTS public.outreach_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms','email')),
  template_key text,
  sent int NOT NULL DEFAULT 0,
  delivered int NOT NULL DEFAULT 0,
  clicked int NOT NULL DEFAULT 0,
  activated int NOT NULL DEFAULT 0,
  cost_cents int NOT NULL DEFAULT 0,
  revenue_cents int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_winner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant, channel)
);
GRANT SELECT, INSERT, UPDATE ON public.outreach_experiments TO authenticated;
GRANT ALL ON public.outreach_experiments TO service_role;
ALTER TABLE public.outreach_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage experiments" ON public.outreach_experiments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Seed baseline experiments
INSERT INTO public.outreach_experiments (variant, channel, template_key)
VALUES
  ('founder_1dollar_v1','sms','founder_1dollar'),
  ('founder_1dollar_v2','sms','founder_1dollar_urgency'),
  ('founder_1dollar_email_v1','email','founder_1dollar_email')
ON CONFLICT (variant, channel) DO NOTHING;

-- 5. Revenue Progress view
CREATE OR REPLACE VIEW public.v_revenue_progress
WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.verified_contractor_prospects WHERE verification_status='verified') AS verified_companies,
  (SELECT count(*) FROM public.verified_contractor_prospects
     WHERE verification_status='verified' AND sms_eligibility_tier IN ('A','B','C') AND outreach_status='none') AS ready_for_sms,
  (SELECT count(*) FROM public.verified_contractor_prospects
     WHERE verification_status='verified' AND sms_eligibility_tier='D' AND outreach_status='none') AS ready_for_email,
  (SELECT count(*) FROM public.verified_contractor_prospects WHERE outreach_status IN ('sent','delivered','clicked','activated')) AS contacted,
  (SELECT count(*) FROM public.verified_contractor_prospects WHERE outreach_status IN ('delivered','clicked','activated')) AS delivered,
  (SELECT count(*) FROM public.verified_contractor_prospects WHERE outreach_status IN ('clicked','activated')) AS clicked,
  (SELECT count(*) FROM public.verified_contractor_prospects WHERE outreach_status='activated') AS activated,
  (SELECT COALESCE(SUM(revenue_cents),0) FROM public.outreach_experiments) AS revenue_cents;

GRANT SELECT ON public.v_revenue_progress TO authenticated;
