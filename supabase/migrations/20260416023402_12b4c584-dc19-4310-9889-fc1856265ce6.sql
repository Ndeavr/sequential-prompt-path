
-- ═══════════════════════════════════════════════════════
-- Voice Orchestrator: voice_configs
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.voice_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL DEFAULT 'prod' CHECK (environment IN ('prod', 'dev', 'staging')),
  agent_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  language_default TEXT NOT NULL DEFAULT 'fr' CHECK (language_default IN ('fr', 'en')),
  allow_switch BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_configs_active_env
  ON public.voice_configs (environment) WHERE status = 'active';

ALTER TABLE public.voice_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active voice configs"
  ON public.voice_configs FOR SELECT
  USING (status = 'active');

CREATE POLICY "Service role full access voice_configs"
  ON public.voice_configs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════
-- Voice Orchestrator: voice_agent_mappings
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.voice_agent_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  valid BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  verification_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, language)
);

ALTER TABLE public.voice_agent_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read valid mappings"
  ON public.voice_agent_mappings FOR SELECT
  USING (valid = true);

CREATE POLICY "Service role full access voice_agent_mappings"
  ON public.voice_agent_mappings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════
-- Voice Orchestrator: voice_runtime_logs
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.voice_runtime_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  agent_id_used TEXT NOT NULL,
  voice_id_used TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  fallback_reason TEXT,
  error_message TEXT,
  latency_ms INTEGER,
  event_type TEXT NOT NULL DEFAULT 'session_start' CHECK (event_type IN ('session_start', 'session_end', 'language_switch', 'fallback', 'error', 'mismatch', 'validation')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_runtime_logs_created ON public.voice_runtime_logs (created_at DESC);
CREATE INDEX idx_voice_runtime_logs_agent ON public.voice_runtime_logs (agent_id_used);
CREATE INDEX idx_voice_runtime_logs_event ON public.voice_runtime_logs (event_type);

ALTER TABLE public.voice_runtime_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert runtime logs"
  ON public.voice_runtime_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read all runtime logs"
  ON public.voice_runtime_logs FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Anon can read own runtime logs"
  ON public.voice_runtime_logs FOR SELECT
  TO anon
  USING (true);

-- ═══════════════════════════════════════════════════════
-- Trigger: auto-update updated_at on voice_configs
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_updated_at_voice()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_voice_configs_updated_at
  BEFORE UPDATE ON public.voice_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_voice();

CREATE TRIGGER trg_voice_agent_mappings_updated_at
  BEFORE UPDATE ON public.voice_agent_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_voice();
