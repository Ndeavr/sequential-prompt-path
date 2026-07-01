
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  success BOOLEAN,
  error_message TEXT,
  contractor_id TEXT,
  session_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_swe_received_at ON public.stripe_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_swe_contractor ON public.stripe_webhook_events(contractor_id);
CREATE INDEX IF NOT EXISTS idx_swe_session ON public.stripe_webhook_events(session_id);

GRANT SELECT ON public.stripe_webhook_events TO authenticated;
GRANT ALL ON public.stripe_webhook_events TO service_role;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stripe webhook events"
  ON public.stripe_webhook_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


CREATE TABLE IF NOT EXISTS public.revenue_gate_audit_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('before','after')),
  snapshot JSONB NOT NULL,
  session_id TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by UUID
);

CREATE INDEX IF NOT EXISTS idx_rgar_contractor ON public.revenue_gate_audit_runs(contractor_id, captured_at DESC);

GRANT SELECT, INSERT ON public.revenue_gate_audit_runs TO authenticated;
GRANT ALL ON public.revenue_gate_audit_runs TO service_role;

ALTER TABLE public.revenue_gate_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage revenue gate audit"
  ON public.revenue_gate_audit_runs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
