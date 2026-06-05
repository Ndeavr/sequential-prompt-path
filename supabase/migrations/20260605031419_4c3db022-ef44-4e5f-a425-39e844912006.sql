
-- ============ LAUNCH MODE STATE (singleton) ============
CREATE TABLE public.launch_mode_state (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  mode TEXT NOT NULL DEFAULT 'idle' CHECK (mode IN ('idle','launching','paused','first_customer_acquired')),
  founder_mode_enabled BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  first_customer_acquired_at TIMESTAMPTZ,
  first_customer_contractor_id UUID,
  first_customer_source TEXT,
  first_customer_message_template TEXT,
  first_customer_plan TEXT,
  first_customer_revenue_cents INTEGER,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.launch_mode_state TO authenticated;
GRANT ALL ON public.launch_mode_state TO service_role;
ALTER TABLE public.launch_mode_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read launch state" ON public.launch_mode_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update launch state" ON public.launch_mode_state
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.launch_mode_state (id, mode) VALUES (true, 'idle') ON CONFLICT DO NOTHING;

-- ============ LAUNCH LEADS ============
CREATE TABLE public.launch_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID,
  external_ref TEXT,
  company_name TEXT,
  city TEXT,
  trade TEXT,
  phone TEXT,
  email TEXT,
  lead_status TEXT NOT NULL DEFAULT 'DISCOVERED',
  reply_classification TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  failure_code TEXT,
  block_reason TEXT,
  next_retry_at TIMESTAMPTZ,
  revenue_impact_cents INTEGER DEFAULT 0,
  source_agent TEXT,
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_launch_leads_status ON public.launch_leads(lead_status);
CREATE INDEX idx_launch_leads_next_retry ON public.launch_leads(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX idx_launch_leads_contractor ON public.launch_leads(contractor_id);
GRANT SELECT ON public.launch_leads TO authenticated;
GRANT ALL ON public.launch_leads TO service_role;
ALTER TABLE public.launch_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read launch leads" ON public.launch_leads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ LAUNCH PIPELINE EVENTS ============
CREATE TABLE public.launch_pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.launch_leads(id) ON DELETE CASCADE,
  contractor_id UUID,
  agent TEXT NOT NULL,
  event TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_launch_events_created ON public.launch_pipeline_events(created_at DESC);
CREATE INDEX idx_launch_events_lead ON public.launch_pipeline_events(lead_id);
CREATE INDEX idx_launch_events_agent ON public.launch_pipeline_events(agent);
GRANT SELECT ON public.launch_pipeline_events TO authenticated;
GRANT ALL ON public.launch_pipeline_events TO service_role;
ALTER TABLE public.launch_pipeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read launch events" ON public.launch_pipeline_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ LAUNCH FOLLOWUP SCHEDULE ============
CREATE TABLE public.launch_followup_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.launch_leads(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  due_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id, attempt_number)
);
CREATE INDEX idx_launch_followup_due ON public.launch_followup_schedule(due_at) WHERE sent_at IS NULL;
GRANT SELECT ON public.launch_followup_schedule TO authenticated;
GRANT ALL ON public.launch_followup_schedule TO service_role;
ALTER TABLE public.launch_followup_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read launch followups" ON public.launch_followup_schedule
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ updated_at trigger ============
CREATE TRIGGER trg_launch_leads_updated_at
  BEFORE UPDATE ON public.launch_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_launch_mode_state_updated_at
  BEFORE UPDATE ON public.launch_mode_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
