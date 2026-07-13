
-- 1. Prospect funnel columns
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS landing_token text,
  ADD COLUMN IF NOT EXISTS funnel_status text DEFAULT 'scraped',
  ADD COLUMN IF NOT EXISTS funnel_status_updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS contractor_id uuid,
  ADD COLUMN IF NOT EXISTS activation_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS recommendable boolean DEFAULT false;

-- Backfill landing tokens (url-safe base64, ~16 chars)
UPDATE public.prospects
SET landing_token = replace(replace(encode(gen_random_bytes(12), 'base64'), '+', '-'), '/', '_')
WHERE landing_token IS NULL;

-- Enforce uniqueness after backfill
CREATE UNIQUE INDEX IF NOT EXISTS prospects_landing_token_key
  ON public.prospects(landing_token) WHERE landing_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_funnel_status
  ON public.prospects(funnel_status);

-- 2. Outreach message tracking columns
ALTER TABLE public.outreach_messages
  ADD COLUMN IF NOT EXISTS short_link_token text,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS landing_viewed_at timestamptz;

UPDATE public.outreach_messages
SET short_link_token = replace(replace(encode(gen_random_bytes(9), 'base64'), '+', '-'), '/', '_')
WHERE short_link_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS outreach_messages_short_link_token_key
  ON public.outreach_messages(short_link_token) WHERE short_link_token IS NOT NULL;

-- 3. Prospect status transitions (append-only audit)
CREATE TABLE IF NOT EXISTS public.prospect_status_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  contractor_id uuid,
  campaign_id uuid,
  message_id uuid,
  previous_status text,
  new_status text NOT NULL,
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prospect_status_transitions TO authenticated;
GRANT ALL ON public.prospect_status_transitions TO service_role;

ALTER TABLE public.prospect_status_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_prospect_status_transitions"
  ON public.prospect_status_transitions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_pst_prospect ON public.prospect_status_transitions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_pst_created ON public.prospect_status_transitions(created_at DESC);

-- 4. Trigger to log funnel_status changes
CREATE OR REPLACE FUNCTION public.log_prospect_funnel_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.funnel_status IS DISTINCT FROM OLD.funnel_status THEN
    INSERT INTO public.prospect_status_transitions
      (prospect_id, contractor_id, campaign_id, previous_status, new_status, source, metadata)
    VALUES
      (NEW.id, NEW.contractor_id, NEW.campaign_id, OLD.funnel_status, NEW.funnel_status, 'trigger', '{}'::jsonb);
    NEW.funnel_status_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_prospect_funnel_transition ON public.prospects;
CREATE TRIGGER trg_log_prospect_funnel_transition
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_prospect_funnel_transition();

-- 5. E2E test runs table
CREATE TABLE IF NOT EXISTS public.outreach_e2e_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid,
  overall_result text NOT NULL DEFAULT 'pending',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_reason text,
  prospect_id uuid,
  test_phone text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.outreach_e2e_test_runs TO authenticated;
GRANT ALL ON public.outreach_e2e_test_runs TO service_role;

ALTER TABLE public.outreach_e2e_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_outreach_e2e_test_runs"
  ON public.outreach_e2e_test_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_e2e_runs_started ON public.outreach_e2e_test_runs(started_at DESC);

-- 6. KPI view for /admin/outreach-funnel
CREATE OR REPLACE VIEW public.v_outreach_funnel_kpis
WITH (security_invoker = true)
AS
SELECT
  count(*) FILTER (WHERE funnel_status = 'scraped')            AS scraped,
  count(*) FILTER (WHERE funnel_status = 'ready_to_contact')   AS ready_to_contact,
  count(*) FILTER (WHERE funnel_status = 'sms_queued')         AS sms_queued,
  count(*) FILTER (WHERE funnel_status = 'sms_sent')           AS sms_sent,
  count(*) FILTER (WHERE funnel_status = 'sms_delivered')      AS sms_delivered,
  count(*) FILTER (WHERE funnel_status = 'sms_failed')         AS sms_failed,
  count(*) FILTER (WHERE funnel_status = 'sms_clicked')        AS sms_clicked,
  count(*) FILTER (WHERE funnel_status = 'landing_viewed')     AS landing_viewed,
  count(*) FILTER (WHERE funnel_status = 'signup_started')     AS signup_started,
  count(*) FILTER (WHERE funnel_status = 'profile_started')    AS profile_started,
  count(*) FILTER (WHERE funnel_status = 'checkout_started')   AS checkout_started,
  count(*) FILTER (WHERE funnel_status = 'paid_1_dollar')      AS paid_1_dollar,
  count(*) FILTER (WHERE funnel_status = 'activated')          AS activated,
  count(*) FILTER (WHERE recommendable = true)                 AS recommendable
FROM public.prospects;

GRANT SELECT ON public.v_outreach_funnel_kpis TO authenticated;
