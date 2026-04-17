
-- 1) Targets
CREATE TABLE public.challenge_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  target_value INTEGER NOT NULL DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Funnel events
CREATE TABLE public.challenge_signup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_key TEXT NOT NULL DEFAULT 'first_signup_72h',
  event_type TEXT NOT NULL,
  agent_source TEXT,
  prospect_id UUID,
  outbound_lead_id UUID,
  user_id UUID,
  funnel_stage TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_challenge_events_created ON public.challenge_signup_events (created_at DESC);
CREATE INDEX idx_challenge_events_type ON public.challenge_signup_events (event_type);
CREATE INDEX idx_challenge_events_stage ON public.challenge_signup_events (funnel_stage);

-- 3) Agent state (kill switches + last run)
CREATE TABLE public.challenge_agent_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_summary JSONB,
  last_error TEXT,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_processed INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at triggers
CREATE TRIGGER trg_challenge_targets_updated BEFORE UPDATE ON public.challenge_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_challenge_agent_state_updated BEFORE UPDATE ON public.challenge_agent_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.challenge_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_signup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_agent_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read targets" ON public.challenge_targets FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write targets" ON public.challenge_targets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin read events" ON public.challenge_signup_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write events" ON public.challenge_signup_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin read agents" ON public.challenge_agent_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write agents" ON public.challenge_agent_state FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed initial challenge + 4 agents
INSERT INTO public.challenge_targets (challenge_key, label, target_value, ends_at, metadata)
VALUES ('first_signup_72h', '1 signup entrepreneur en 72h', 1, now() + interval '3 days', '{"priority":"critical"}'::jsonb)
ON CONFLICT (challenge_key) DO NOTHING;

INSERT INTO public.challenge_agent_state (agent_key, agent_name, config) VALUES
  ('signup_hunter','Signup Hunter (scan + qualify prospects)','{"interval_minutes":30,"max_per_run":50}'::jsonb),
  ('email_sequence','Email Sequence Orchestrator (3-touch)','{"interval_minutes":15,"max_per_run":20}'::jsonb),
  ('signup_conversion','Signup Conversion Agent (event-driven nudges)','{"interval_minutes":10}'::jsonb),
  ('daily_reporter','Daily Progress Reporter','{"hour_of_day":8}'::jsonb)
ON CONFLICT (agent_key) DO NOTHING;
