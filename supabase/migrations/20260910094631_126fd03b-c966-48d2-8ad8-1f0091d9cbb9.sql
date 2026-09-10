CREATE TABLE IF NOT EXISTS public.acquisition_discovery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  trigger_source text,
  searches_planned integer NOT NULL DEFAULT 0,
  searches_executed integer NOT NULL DEFAULT 0,
  external_calls integer NOT NULL DEFAULT 0,
  cache_hits integer NOT NULL DEFAULT 0,
  found integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  enriched integer NOT NULL DEFAULT 0,
  bridged_verified integer NOT NULL DEFAULT 0,
  queued integer NOT NULL DEFAULT 0,
  blocked_reason text,
  circuit_state text,
  pairs jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.acquisition_discovery_runs TO authenticated;
GRANT ALL ON public.acquisition_discovery_runs TO service_role;

ALTER TABLE public.acquisition_discovery_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read discovery runs" ON public.acquisition_discovery_runs;
CREATE POLICY "Admins read discovery runs"
  ON public.acquisition_discovery_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role manages discovery runs" ON public.acquisition_discovery_runs;
CREATE POLICY "Service role manages discovery runs"
  ON public.acquisition_discovery_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS acquisition_discovery_runs_started_idx
  ON public.acquisition_discovery_runs (started_at DESC);

DROP TRIGGER IF EXISTS update_acquisition_discovery_runs_updated_at ON public.acquisition_discovery_runs;
CREATE TRIGGER update_acquisition_discovery_runs_updated_at
  BEFORE UPDATE ON public.acquisition_discovery_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_flags (key, value)
VALUES ('DISCOVERY_ENABLED', true)
ON CONFLICT (key) DO UPDATE SET value = true;

UPDATE public.provider_circuit_state
SET kill_switch = false,
    state = 'closed',
    failure_count = 0,
    last_error_code = null,
    last_error_message = null,
    remediation = 'Découverte réactivée sous plafond strict : 1 page par recherche, cache 14 jours, 25 appels externes/jour maximum (réservation atomique).',
    opened_at = null,
    retry_after = null,
    updated_at = now()
WHERE provider = 'google_places';