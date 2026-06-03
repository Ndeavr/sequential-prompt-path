
-- 1. agent_runs
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','error','paused','skipped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  input jsonb DEFAULT '{}'::jsonb,
  output jsonb DEFAULT '{}'::jsonb,
  error text,
  triggered_by text DEFAULT 'cron',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_runs_agent_started ON public.agent_runs(agent_name, started_at DESC);
CREATE INDEX idx_agent_runs_status ON public.agent_runs(status) WHERE status IN ('running','error');
GRANT SELECT ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read agent_runs" ON public.agent_runs FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Service writes agent_runs" ON public.agent_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. ai_visibility_reports
CREATE TABLE public.ai_visibility_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  visibility_score integer CHECK (visibility_score BETWEEN 0 AND 100),
  ai_citation_probability numeric,
  semantic_clarity numeric,
  trust_signal numeric,
  competitors jsonb DEFAULT '[]'::jsonb,
  missing_entities jsonb DEFAULT '[]'::jsonb,
  strengths jsonb DEFAULT '[]'::jsonb,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  trade text,
  city text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aivr_lead ON public.ai_visibility_reports(lead_id, generated_at DESC);
CREATE INDEX idx_aivr_contractor ON public.ai_visibility_reports(contractor_id, generated_at DESC);
GRANT SELECT ON public.ai_visibility_reports TO authenticated;
GRANT ALL ON public.ai_visibility_reports TO service_role;
ALTER TABLE public.ai_visibility_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ai_visibility_reports" ON public.ai_visibility_reports FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public read ai_visibility_reports" ON public.ai_visibility_reports FOR SELECT TO anon USING (true);
CREATE POLICY "Service writes ai_visibility_reports" ON public.ai_visibility_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT ON public.ai_visibility_reports TO anon;

-- 3. activation_quotas
CREATE TABLE public.activation_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global','trade','city','trade_city','phone')),
  scope_key text NOT NULL DEFAULT '*',
  channel text NOT NULL CHECK (channel IN ('sms','email','activation','scrape')),
  period_date date NOT NULL DEFAULT CURRENT_DATE,
  limit_count integer NOT NULL DEFAULT 0,
  used_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, scope_key, channel, period_date)
);
CREATE INDEX idx_quotas_lookup ON public.activation_quotas(channel, period_date, scope);
GRANT SELECT ON public.activation_quotas TO authenticated;
GRANT ALL ON public.activation_quotas TO service_role;
ALTER TABLE public.activation_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read quotas" ON public.activation_quotas FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage quotas" ON public.activation_quotas FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Service writes quotas" ON public.activation_quotas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. agent_safety_events
CREATE TABLE public.agent_safety_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text,
  event_type text NOT NULL CHECK (event_type IN ('bounce_high','sms_fail','stripe_error','complaint','saturation','quota_exhausted','api_exhausted','manual_pause')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  scope_key text,
  details jsonb DEFAULT '{}'::jsonb,
  auto_paused boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_safety_recent ON public.agent_safety_events(created_at DESC);
GRANT SELECT ON public.agent_safety_events TO authenticated;
GRANT ALL ON public.agent_safety_events TO service_role;
ALTER TABLE public.agent_safety_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read safety" ON public.agent_safety_events FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage safety" ON public.agent_safety_events FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Service writes safety" ON public.agent_safety_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Extend acq_territory_slots
ALTER TABLE public.acq_territory_slots
  ADD COLUMN IF NOT EXISTS lock_status text NOT NULL DEFAULT 'open' CHECK (lock_status IN ('open','auto','manual')),
  ADD COLUMN IF NOT EXISTS auto_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS saturation_percent numeric GENERATED ALWAYS AS (
    CASE WHEN max_slots > 0 THEN LEAST(100, ROUND((used_slots::numeric / max_slots::numeric) * 100, 2)) ELSE 0 END
  ) STORED;

-- 6. Extend contractor_leads
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS ai_visibility_score integer CHECK (ai_visibility_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS agent_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_agent_run_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contractor_leads_agent_pipeline
  ON public.contractor_leads(lead_status, enrichment_status, score_status, outreach_status);

-- 7. updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_quotas_updated_at ON public.activation_quotas;
CREATE TRIGGER trg_quotas_updated_at BEFORE UPDATE ON public.activation_quotas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
