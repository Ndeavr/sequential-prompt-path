-- ─────────────────────────────────────────────────────────────
-- LOT 1 — Pipeline Command Center : vues + RPC + Realtime
-- ─────────────────────────────────────────────────────────────

-- 1) Vue : runs actifs (live)
CREATE OR REPLACE VIEW public.v_pipeline_runs_live
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.campaign_id,
  r.target_list_id,
  r.status AS run_status,
  r.current_stage,
  r.priority_score,
  r.started_by,
  r.started_at,
  r.finished_at,
  r.last_transition_at,
  r.diagnostic_summary,
  r.created_at,
  r.updated_at,
  EXTRACT(EPOCH FROM (COALESCE(r.finished_at, NOW()) - r.started_at))::int AS duration_seconds,
  CASE
    WHEN r.status IN ('queued','scheduled') THEN 'queued'
    WHEN r.status IN ('running','in_progress','processing') THEN 'running'
    WHEN r.status IN ('blocked','waiting_dependency') THEN 'blocked'
    WHEN r.status = 'failed' THEN 'failed'
    WHEN r.status IN ('completed','succeeded','success') THEN 'succeeded'
    WHEN r.status = 'partial_success' THEN 'partial_success'
    WHEN r.status = 'cancelled' THEN 'cancelled'
    ELSE 'unknown'
  END AS normalized_status,
  (SELECT COUNT(*) FROM public.automation_blockers b
     WHERE b.run_id = r.id AND b.status = 'open') AS open_blockers_count,
  (SELECT COUNT(*) FROM public.outbound_run_stage_transitions t
     WHERE t.run_id = r.id) AS transitions_count
FROM public.outbound_autopilot_runs r;

-- 2) Vue : métriques par étape sur 24h
CREATE OR REPLACE VIEW public.v_pipeline_stage_metrics_24h
WITH (security_invoker = true) AS
WITH last_per_run AS (
  SELECT DISTINCT ON (run_id)
    run_id, to_stage, transition_status, created_at
  FROM public.outbound_run_stage_transitions
  WHERE created_at > NOW() - INTERVAL '24 hours'
  ORDER BY run_id, created_at DESC
)
SELECT
  COALESCE(lpr.to_stage, 'unknown') AS stage_key,
  COUNT(*) FILTER (WHERE lpr.transition_status IN ('queued','scheduled')) AS queued_count,
  COUNT(*) FILTER (WHERE lpr.transition_status IN ('running','in_progress')) AS running_count,
  COUNT(*) FILTER (WHERE lpr.transition_status IN ('completed','succeeded','success')) AS success_count,
  COUNT(*) FILTER (WHERE lpr.transition_status = 'failed') AS failed_count,
  COUNT(*) FILTER (WHERE lpr.transition_status IN ('blocked','waiting_dependency')) AS blocked_count,
  COUNT(*) AS total_count,
  MAX(lpr.created_at) AS last_activity_at
FROM last_per_run lpr
GROUP BY lpr.to_stage;

-- 3) Vue : santé des dépendances (inférée)
CREATE OR REPLACE VIEW public.v_pipeline_dependency_health
WITH (security_invoker = true) AS
WITH dep_blockers AS (
  SELECT
    COALESCE(NULLIF(engine_name, ''), 'unknown') AS dependency_key,
    COUNT(*) FILTER (WHERE status = 'open') AS open_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS incidents_24h,
    MAX(detected_at) AS last_failure_at
  FROM public.automation_blockers
  GROUP BY engine_name
),
dep_jobs AS (
  SELECT
    COALESCE(NULLIF(job_type, ''), 'unknown') AS dependency_key,
    MAX(finished_at) FILTER (WHERE status IN ('completed','succeeded')) AS last_success_at,
    AVG(duration_ms) FILTER (WHERE status IN ('completed','succeeded') AND created_at > NOW() - INTERVAL '24 hours') AS avg_latency_ms
  FROM public.automation_jobs
  GROUP BY job_type
)
SELECT
  COALESCE(b.dependency_key, j.dependency_key) AS dependency_key,
  COALESCE(b.dependency_key, j.dependency_key) AS dependency_name,
  CASE
    WHEN COALESCE(b.open_count,0) >= 3 THEN 'failed'
    WHEN COALESCE(b.open_count,0) >= 1 THEN 'degraded'
    WHEN j.last_success_at IS NULL OR j.last_success_at < NOW() - INTERVAL '24 hours' THEN 'unknown'
    ELSE 'healthy'
  END AS status,
  COALESCE(b.open_count, 0) AS open_blockers,
  COALESCE(b.incidents_24h, 0) AS incidents_24h,
  b.last_failure_at,
  j.last_success_at,
  j.avg_latency_ms::int AS avg_latency_ms
FROM dep_blockers b
FULL OUTER JOIN dep_jobs j ON j.dependency_key = b.dependency_key;

-- 4) RPC : overview unifié pour le command center
CREATE OR REPLACE FUNCTION public.rpc_pipeline_get_live_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'active_runs', (SELECT COUNT(*) FROM v_pipeline_runs_live WHERE normalized_status IN ('queued','running')),
      'succeeded_24h', (SELECT COUNT(*) FROM outbound_autopilot_runs WHERE status IN ('completed','succeeded','success') AND finished_at > NOW() - INTERVAL '24 hours'),
      'failed_24h', (SELECT COUNT(*) FROM outbound_autopilot_runs WHERE status = 'failed' AND finished_at > NOW() - INTERVAL '24 hours'),
      'blocked_items', (SELECT COUNT(*) FROM automation_blockers WHERE status = 'open'),
      'critical_blockers', (SELECT COUNT(*) FROM automation_blockers WHERE status = 'open' AND severity_level IN ('critical','high')),
      'avg_run_duration_seconds', (SELECT COALESCE(AVG(duration_seconds),0)::int FROM v_pipeline_runs_live WHERE finished_at > NOW() - INTERVAL '24 hours')
    ),
    'active_runs', COALESCE((
      SELECT jsonb_agg(row_to_json(r)) FROM (
        SELECT id, campaign_id, run_status, normalized_status, current_stage, started_at,
               last_transition_at, duration_seconds, open_blockers_count, transitions_count
        FROM v_pipeline_runs_live
        WHERE normalized_status IN ('queued','running','blocked')
        ORDER BY started_at DESC NULLS LAST
        LIMIT 50
      ) r
    ), '[]'::jsonb),
    'open_blockers', COALESCE((
      SELECT jsonb_agg(row_to_json(b)) FROM (
        SELECT id, blocker_key, engine_name, severity_level, blocker_type, blocker_title,
               blocker_message, suggested_resolution, retry_possible, run_id, detected_at
        FROM automation_blockers
        WHERE status = 'open'
        ORDER BY
          CASE severity_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
          detected_at DESC
        LIMIT 30
      ) b
    ), '[]'::jsonb),
    'dependencies', COALESCE((
      SELECT jsonb_agg(row_to_json(d)) FROM (
        SELECT * FROM v_pipeline_dependency_health
        ORDER BY CASE status WHEN 'failed' THEN 1 WHEN 'degraded' THEN 2 WHEN 'unknown' THEN 3 ELSE 4 END
      ) d
    ), '[]'::jsonb),
    'stage_metrics', COALESCE((
      SELECT jsonb_agg(row_to_json(s)) FROM (
        SELECT * FROM v_pipeline_stage_metrics_24h
        ORDER BY total_count DESC
      ) s
    ), '[]'::jsonb),
    'generated_at', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

-- 5) Realtime : ajouter les tables clés à la publication supabase_realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'outbound_autopilot_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.outbound_autopilot_runs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'automation_blockers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_blockers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'automation_agents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_agents;
  END IF;
END $$;

-- REPLICA IDENTITY FULL pour avoir les anciennes valeurs dans les payloads UPDATE/DELETE
ALTER TABLE public.outbound_autopilot_runs REPLICA IDENTITY FULL;
ALTER TABLE public.automation_blockers REPLICA IDENTITY FULL;
ALTER TABLE public.automation_agents REPLICA IDENTITY FULL;