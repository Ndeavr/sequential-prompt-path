
CREATE TABLE IF NOT EXISTS public.places_query_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'google_places',
  trade_norm text NOT NULL,
  city_norm text NOT NULL,
  query_text text NOT NULL,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_count integer NOT NULL DEFAULT 0,
  hit_count integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.places_query_cache TO authenticated;
GRANT ALL ON public.places_query_cache TO service_role;
ALTER TABLE public.places_query_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read places cache" ON public.places_query_cache
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_places_cache_lookup ON public.places_query_cache (trade_norm, city_norm, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_circuit_state (
  provider text PRIMARY KEY,
  state text NOT NULL DEFAULT 'closed',
  kill_switch boolean NOT NULL DEFAULT false,
  failure_count integer NOT NULL DEFAULT 0,
  last_error_code text,
  last_error_message text,
  remediation text,
  opened_at timestamptz,
  retry_after timestamptz,
  last_success_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_circuit_state TO authenticated;
GRANT ALL ON public.provider_circuit_state TO service_role;
ALTER TABLE public.provider_circuit_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read circuit state" ON public.provider_circuit_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage circuit state" ON public.provider_circuit_state
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.provider_circuit_state (provider) VALUES ('google_places')
ON CONFLICT (provider) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.places_api_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'google_places',
  trade_norm text,
  city_norm text,
  outcome text NOT NULL,
  cache_hit boolean NOT NULL DEFAULT false,
  external_calls integer NOT NULL DEFAULT 0,
  calls_avoided integer NOT NULL DEFAULT 0,
  result_count integer NOT NULL DEFAULT 0,
  error_code text,
  caller text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.places_api_calls TO authenticated;
GRANT ALL ON public.places_api_calls TO service_role;
ALTER TABLE public.places_api_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read places calls" ON public.places_api_calls
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_places_calls_created ON public.places_api_calls (created_at DESC);

CREATE OR REPLACE VIEW public.v_places_discovery_health
WITH (security_invoker = true) AS
SELECT
  c.provider,
  c.state,
  c.kill_switch,
  c.failure_count,
  c.last_error_code,
  c.last_error_message,
  c.remediation,
  c.retry_after,
  c.last_success_at,
  COALESCE(s.calls_24h, 0)         AS calls_24h,
  COALESCE(s.external_24h, 0)      AS external_calls_24h,
  COALESCE(s.cache_hits_24h, 0)    AS cache_hits_24h,
  COALESCE(s.avoided_24h, 0)       AS calls_avoided_24h,
  COALESCE(s.errors_24h, 0)        AS errors_24h,
  COALESCE(s.results_24h, 0)       AS results_24h,
  CASE WHEN COALESCE(s.calls_24h, 0) = 0 THEN 0
       ELSE ROUND(100.0 * COALESCE(s.cache_hits_24h,0) / s.calls_24h, 1) END AS cache_hit_rate_pct,
  (SELECT COUNT(*) FROM public.places_query_cache q WHERE q.expires_at > now()) AS cache_entries_fresh
FROM public.provider_circuit_state c
LEFT JOIN (
  SELECT provider,
         COUNT(*)                                   AS calls_24h,
         SUM(external_calls)                        AS external_24h,
         COUNT(*) FILTER (WHERE cache_hit)          AS cache_hits_24h,
         SUM(calls_avoided)                         AS avoided_24h,
         COUNT(*) FILTER (WHERE error_code IS NOT NULL) AS errors_24h,
         SUM(result_count)                          AS results_24h
  FROM public.places_api_calls
  WHERE created_at > now() - interval '24 hours'
  GROUP BY provider
) s ON s.provider = c.provider;

GRANT SELECT ON public.v_places_discovery_health TO authenticated;
GRANT SELECT ON public.v_places_discovery_health TO service_role;
