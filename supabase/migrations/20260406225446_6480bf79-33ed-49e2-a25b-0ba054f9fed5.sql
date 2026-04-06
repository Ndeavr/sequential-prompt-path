
-- alex_runtime_sessions
CREATE TABLE public.alex_runtime_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  runtime_instance_id TEXT NOT NULL,
  page_key TEXT NOT NULL DEFAULT 'home',
  route_path TEXT NOT NULL DEFAULT '/',
  device_type TEXT NOT NULL DEFAULT 'desktop',
  session_status TEXT NOT NULL DEFAULT 'idle',
  voice_id TEXT,
  primary_component_name TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  autostart_triggered BOOLEAN DEFAULT false,
  autostart_completed BOOLEAN DEFAULT false,
  duplicate_attempts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_runtime_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alex_runtime_sessions_public_read" ON public.alex_runtime_sessions FOR SELECT USING (true);
CREATE POLICY "alex_runtime_sessions_public_insert" ON public.alex_runtime_sessions FOR INSERT WITH CHECK (true);

-- alex_runtime_events
CREATE TABLE public.alex_runtime_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alex_runtime_session_id UUID REFERENCES public.alex_runtime_sessions(id) ON DELETE CASCADE,
  runtime_instance_id TEXT NOT NULL,
  component_name TEXT NOT NULL,
  mount_role TEXT NOT NULL DEFAULT 'primary',
  event_type TEXT NOT NULL,
  event_label TEXT,
  event_payload JSONB DEFAULT '{}'::jsonb,
  voice_id TEXT,
  audio_source_id TEXT,
  result_status TEXT NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_runtime_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alex_runtime_events_public_read" ON public.alex_runtime_events FOR SELECT USING (true);
CREATE POLICY "alex_runtime_events_public_insert" ON public.alex_runtime_events FOR INSERT WITH CHECK (true);

-- alex_runtime_conflicts
CREATE TABLE public.alex_runtime_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alex_runtime_session_id UUID REFERENCES public.alex_runtime_sessions(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL,
  primary_component_name TEXT,
  secondary_component_name TEXT,
  primary_voice_id TEXT,
  secondary_voice_id TEXT,
  conflict_reason TEXT,
  auto_resolved BOOLEAN DEFAULT false,
  resolution_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_runtime_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alex_runtime_conflicts_public_read" ON public.alex_runtime_conflicts FOR SELECT USING (true);
CREATE POLICY "alex_runtime_conflicts_public_insert" ON public.alex_runtime_conflicts FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_alex_runtime_sessions_instance ON public.alex_runtime_sessions(runtime_instance_id);
CREATE INDEX idx_alex_runtime_events_session ON public.alex_runtime_events(alex_runtime_session_id);
CREATE INDEX idx_alex_runtime_conflicts_session ON public.alex_runtime_conflicts(alex_runtime_session_id);
