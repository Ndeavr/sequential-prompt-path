
-- 1. acquisition_pipeline_runs
CREATE TABLE IF NOT EXISTS public.acquisition_pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('scrape','enrich','aipp','outreach','outreach_send','checkout','full_test','health_check','activation')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','partial')),
  total_items integer NOT NULL DEFAULT 0,
  succeeded_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  blocked_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  triggered_by uuid,
  triggered_by_label text,
  input_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acq_runs_started ON public.acquisition_pipeline_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_acq_runs_type_status ON public.acquisition_pipeline_runs(run_type, status);

GRANT SELECT, INSERT, UPDATE ON public.acquisition_pipeline_runs TO authenticated;
GRANT ALL ON public.acquisition_pipeline_runs TO service_role;

ALTER TABLE public.acquisition_pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read acq runs" ON public.acquisition_pipeline_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write acq runs" ON public.acquisition_pipeline_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update acq runs" ON public.acquisition_pipeline_runs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 2. acquisition_pipeline_logs
CREATE TABLE IF NOT EXISTS public.acquisition_pipeline_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.acquisition_pipeline_runs(id) ON DELETE CASCADE,
  prospect_id uuid,
  step text NOT NULL,
  status text NOT NULL CHECK (status IN ('info','success','warning','error','blocked','skipped')),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acq_logs_run ON public.acquisition_pipeline_logs(run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acq_logs_prospect ON public.acquisition_pipeline_logs(prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acq_logs_status ON public.acquisition_pipeline_logs(status, created_at DESC);

GRANT SELECT, INSERT ON public.acquisition_pipeline_logs TO authenticated;
GRANT ALL ON public.acquisition_pipeline_logs TO service_role;

ALTER TABLE public.acquisition_pipeline_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read acq logs" ON public.acquisition_pipeline_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write acq logs" ON public.acquisition_pipeline_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. system_config_health
CREATE TABLE IF NOT EXISTS public.system_config_health (
  service_name text PRIMARY KEY,
  status text NOT NULL DEFAULT 'missing' CHECK (status IN ('connected','missing','invalid','limited','unknown')),
  required_for text[] NOT NULL DEFAULT '{}',
  last_checked_at timestamptz,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_config_health TO authenticated;
GRANT ALL ON public.system_config_health TO service_role;

ALTER TABLE public.system_config_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sys health" ON public.system_config_health FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Seed default services so cockpit shows greys not blanks
INSERT INTO public.system_config_health (service_name, status, required_for) VALUES
  ('google_places','unknown', ARRAY['scrape']),
  ('resend','unknown', ARRAY['outreach_email']),
  ('twilio','unknown', ARRAY['outreach_sms']),
  ('stripe','unknown', ARRAY['checkout','activation']),
  ('stripe_webhook','unknown', ARRAY['activation']),
  ('gemini','unknown', ARRAY['aipp','outreach']),
  ('firecrawl','unknown', ARRAY['enrich','aipp']),
  ('supabase_edge','unknown', ARRAY['all'])
ON CONFLICT (service_name) DO NOTHING;

-- 4. Missing columns on contractor_prospects
ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS aipp_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS contractor_id uuid,
  ADD COLUMN IF NOT EXISTS selected_plan text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS public_slug text;

CREATE INDEX IF NOT EXISTS idx_contractor_prospects_public_slug ON public.contractor_prospects(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contractor_prospects_payment ON public.contractor_prospects(payment_status, activation_status);
