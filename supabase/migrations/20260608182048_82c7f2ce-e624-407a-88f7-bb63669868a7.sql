
CREATE TABLE public.growth_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  job_id UUID,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','blocked','failed','idle')),
  input_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  generated_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.growth_agent_logs TO authenticated;
GRANT ALL ON public.growth_agent_logs TO service_role;
ALTER TABLE public.growth_agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read growth_agent_logs" ON public.growth_agent_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service writes growth_agent_logs" ON public.growth_agent_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_gal_agent_started ON public.growth_agent_logs (agent_name, started_at DESC);
CREATE INDEX idx_gal_status ON public.growth_agent_logs (status, started_at DESC);

CREATE TABLE public.growth_outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email')),
  recipient TEXT NOT NULL,
  message_body TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued','generated','waiting_approval','approved','sending','sent',
    'delivered','failed','blocked','replied','booked','activated'
  )),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.growth_outbound_messages TO authenticated;
GRANT ALL ON public.growth_outbound_messages TO service_role;
ALTER TABLE public.growth_outbound_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read growth_outbound_messages" ON public.growth_outbound_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service writes growth_outbound_messages" ON public.growth_outbound_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_gom_status_created ON public.growth_outbound_messages (status, created_at DESC);
CREATE INDEX idx_gom_contractor ON public.growth_outbound_messages (contractor_id);
CREATE INDEX idx_gom_channel_sent ON public.growth_outbound_messages (channel, sent_at DESC);

CREATE TRIGGER trg_gom_updated_at BEFORE UPDATE ON public.growth_outbound_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.v_growth_engine_today
WITH (security_invoker = on) AS
WITH today AS (SELECT date_trunc('day', now()) AS d)
SELECT
  (SELECT COUNT(*)::int FROM public.growth_outbound_messages, today WHERE channel='sms' AND status IN ('sent','delivered','replied','booked','activated') AND sent_at >= today.d) AS sms_sent_today,
  (SELECT COUNT(*)::int FROM public.growth_outbound_messages, today WHERE channel='email' AND status IN ('sent','delivered','replied','booked','activated') AND sent_at >= today.d) AS email_sent_today,
  (SELECT COUNT(*)::int FROM public.growth_outbound_messages, today WHERE status='waiting_approval' AND created_at >= today.d) AS waiting_approval_today,
  (SELECT COUNT(*)::int FROM public.growth_outbound_messages, today WHERE status='failed' AND created_at >= today.d) AS failed_today,
  (SELECT COUNT(*)::int FROM public.growth_outbound_messages, today WHERE status='blocked' AND created_at >= today.d) AS blocked_today,
  (SELECT COUNT(*)::int FROM public.growth_outbound_messages, today WHERE status='replied' AND replied_at >= today.d) AS replies_today,
  (SELECT COUNT(*)::int FROM public.growth_outbound_messages, today WHERE status='booked' AND created_at >= today.d) AS bookings_today,
  (SELECT COUNT(*)::int FROM public.growth_outbound_messages, today WHERE status='activated' AND created_at >= today.d) AS activations_today,
  (SELECT COUNT(DISTINCT contractor_id)::int FROM public.growth_outbound_messages, today WHERE status IN ('sent','delivered','replied','booked','activated') AND sent_at >= today.d) AS contractors_contacted_today,
  ((SELECT COUNT(*) FROM public.growth_outbound_messages, today WHERE status IN ('sent','delivered','replied','booked','activated') AND sent_at >= today.d) > 0) AS is_production_live;

GRANT SELECT ON public.v_growth_engine_today TO authenticated;
