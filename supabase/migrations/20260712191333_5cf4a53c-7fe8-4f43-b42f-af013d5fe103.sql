CREATE TABLE public.activation_flow_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID,
  email TEXT,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  stripe_session_id TEXT,
  stripe_event_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_afe_session ON public.activation_flow_events (stripe_session_id);
CREATE INDEX idx_afe_email ON public.activation_flow_events (email);
CREATE INDEX idx_afe_created ON public.activation_flow_events (created_at DESC);
GRANT SELECT ON public.activation_flow_events TO authenticated;
GRANT ALL ON public.activation_flow_events TO service_role;
ALTER TABLE public.activation_flow_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read all activation flow events"
  ON public.activation_flow_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages activation flow events"
  ON public.activation_flow_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);