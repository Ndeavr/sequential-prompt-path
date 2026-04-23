
-- Contractor funnel analytics events
CREATE TABLE public.contractor_funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  user_id UUID,
  event_type TEXT NOT NULL,
  step TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'web',
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfe_user ON public.contractor_funnel_events(user_id);
CREATE INDEX idx_cfe_event ON public.contractor_funnel_events(event_type);
CREATE INDEX idx_cfe_created ON public.contractor_funnel_events(created_at DESC);
CREATE INDEX idx_cfe_session ON public.contractor_funnel_events(session_id);

ALTER TABLE public.contractor_funnel_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking
CREATE POLICY "Anyone can insert funnel events"
  ON public.contractor_funnel_events FOR INSERT
  WITH CHECK (true);

-- Users can view their own events
CREATE POLICY "Users can view own funnel events"
  ON public.contractor_funnel_events FOR SELECT
  USING (auth.uid() = user_id);

-- CRM follow-up queue
CREATE TABLE public.contractor_followup_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  business_name TEXT,
  trigger_type TEXT NOT NULL, -- '1h', '24h', '3d'
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, cancelled, failed
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfq_status_scheduled ON public.contractor_followup_queue(status, scheduled_at);
CREATE INDEX idx_cfq_user ON public.contractor_followup_queue(user_id);

ALTER TABLE public.contractor_followup_queue ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) manages this table - no public access
CREATE POLICY "Service role manages followup queue"
  ON public.contractor_followup_queue FOR ALL
  USING (false);
