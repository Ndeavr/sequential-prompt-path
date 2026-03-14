
-- Platform events table for observability
CREATE TABLE public.platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'general',
  entity_type TEXT,
  entity_id TEXT,
  user_id UUID,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

-- Admin can read all events
CREATE POLICY "Admin can read platform events"
  ON public.platform_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Any authenticated user can insert events (tracking their own actions)
CREATE POLICY "Users can insert own events"
  ON public.platform_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Anon can insert events (public page tracking)
CREATE POLICY "Anon can insert events"
  ON public.platform_events FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Indexes for analytics queries
CREATE INDEX idx_platform_events_type ON public.platform_events(event_type);
CREATE INDEX idx_platform_events_category ON public.platform_events(event_category);
CREATE INDEX idx_platform_events_created ON public.platform_events(created_at DESC);
CREATE INDEX idx_platform_events_entity ON public.platform_events(entity_type, entity_id);
