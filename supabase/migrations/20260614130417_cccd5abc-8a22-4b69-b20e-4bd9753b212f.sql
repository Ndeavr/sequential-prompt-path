
-- 1) Extend contractor_leads with autopilot fields
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS onboarding_token text,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS recommended_plan_slug text,
  ADD COLUMN IF NOT EXISTS fit_score numeric,
  ADD COLUMN IF NOT EXISTS fit_reasons jsonb,
  ADD COLUMN IF NOT EXISTS last_sms_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_active_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS contractor_leads_onboarding_token_uidx
  ON public.contractor_leads (onboarding_token)
  WHERE onboarding_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS contractor_leads_pipeline_status_idx
  ON public.contractor_leads (pipeline_status);

-- Normalize legacy NULL pipeline_status to 'discovered'
UPDATE public.contractor_leads
   SET pipeline_status = 'discovered'
 WHERE pipeline_status IS NULL;

-- 2) Outreach logs (one row per attempt)
CREATE TABLE IF NOT EXISTS public.contractor_outreach_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  contractor_id uuid,
  channel text NOT NULL CHECK (channel IN ('sms','email')),
  template_key text NOT NULL,
  to_address text NOT NULL,
  message_subject text,
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  provider_response jsonb,
  error_code text,
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contractor_outreach_logs TO authenticated;
GRANT ALL ON public.contractor_outreach_logs TO service_role;

ALTER TABLE public.contractor_outreach_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read outreach logs"
  ON public.contractor_outreach_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS contractor_outreach_logs_sent_at_idx
  ON public.contractor_outreach_logs (sent_at DESC);
CREATE INDEX IF NOT EXISTS contractor_outreach_logs_lead_id_idx
  ON public.contractor_outreach_logs (lead_id);
CREATE INDEX IF NOT EXISTS contractor_outreach_logs_channel_status_idx
  ON public.contractor_outreach_logs (channel, status);

-- 3) Follow-up queue (10-minute SMS→Email)
CREATE TABLE IF NOT EXISTS public.acquisition_followup_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms','email')),
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.acquisition_followup_queue TO authenticated;
GRANT ALL ON public.acquisition_followup_queue TO service_role;

ALTER TABLE public.acquisition_followup_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read followup queue"
  ON public.acquisition_followup_queue
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS acquisition_followup_queue_due_idx
  ON public.acquisition_followup_queue (status, scheduled_at);

-- 4) Cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'acquisition-autopilot-15m') THEN
    PERFORM cron.unschedule('acquisition-autopilot-15m');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'acquisition-followup-5m') THEN
    PERFORM cron.unschedule('acquisition-followup-5m');
  END IF;
END $$;

SELECT cron.schedule(
  'acquisition-autopilot-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/acquisition-autopilot',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
    body:='{"trigger":"cron"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'acquisition-followup-5m',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/acquisition-followup-tick',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk"}'::jsonb,
    body:='{"trigger":"cron"}'::jsonb
  );
  $$
);
