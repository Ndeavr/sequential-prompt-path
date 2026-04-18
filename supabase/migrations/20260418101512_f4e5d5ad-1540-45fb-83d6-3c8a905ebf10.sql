
-- ─── RPC: rpc_pipeline_get_run_details ───────────────────────────
-- Retourne le détail complet d'un run : run + transitions + blockers
CREATE OR REPLACE FUNCTION public.rpc_pipeline_get_run_details(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run jsonb;
  v_transitions jsonb;
  v_blockers jsonb;
BEGIN
  -- run row + computed
  SELECT to_jsonb(r) || jsonb_build_object(
    'duration_seconds', GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(r.finished_at, now()) - r.started_at))::int),
    'normalized_status', CASE
      WHEN r.status IN ('queued','pending') THEN 'queued'
      WHEN r.status IN ('running','in_progress') THEN 'running'
      WHEN r.status IN ('blocked','waiting_dependency') THEN 'blocked'
      WHEN r.status IN ('failed','error') THEN 'failed'
      WHEN r.status IN ('succeeded','completed','success') THEN 'succeeded'
      WHEN r.status IN ('partial_success','partial') THEN 'partial_success'
      WHEN r.status IN ('cancelled','canceled') THEN 'cancelled'
      ELSE 'unknown'
    END
  )
  INTO v_run
  FROM public.outbound_autopilot_runs r
  WHERE r.id = p_run_id;

  IF v_run IS NULL THEN
    RETURN jsonb_build_object('error', 'run_not_found', 'run_id', p_run_id);
  END IF;

  -- transitions ordered
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at ASC), '[]'::jsonb)
  INTO v_transitions
  FROM public.outbound_run_stage_transitions t
  WHERE t.run_id = p_run_id;

  -- open + recent blockers for this run
  SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.detected_at DESC), '[]'::jsonb)
  INTO v_blockers
  FROM public.automation_blockers b
  WHERE b.run_id = p_run_id;

  RETURN jsonb_build_object(
    'run', v_run,
    'transitions', v_transitions,
    'blockers', v_blockers,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_pipeline_get_run_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_pipeline_get_run_details(uuid) TO authenticated;

-- ─── RPC: rpc_pipeline_resolve_blocker ───────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_pipeline_resolve_blocker(p_blocker_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- admin only
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  UPDATE public.automation_blockers
  SET status = 'resolved',
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_blocker_id
    AND status <> 'resolved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found_or_already_resolved');
  END IF;

  RETURN jsonb_build_object('success', true, 'blocker_id', p_blocker_id, 'resolved_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_pipeline_resolve_blocker(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_pipeline_resolve_blocker(uuid, text) TO authenticated;

-- ─── RPC: rpc_pipeline_retry_run ─────────────────────────────────
-- Marque un run comme à re-exécuter (queued + reset du heartbeat)
CREATE OR REPLACE FUNCTION public.rpc_pipeline_retry_run(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  UPDATE public.outbound_autopilot_runs
  SET status = 'queued',
      finished_at = NULL,
      updated_at = now()
  WHERE id = p_run_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- log transition
  INSERT INTO public.outbound_run_stage_transitions (run_id, from_stage, to_stage, transition_status, message)
  SELECT p_run_id, current_stage, current_stage, 'manual_retry',
         'Retry déclenché manuellement par admin'
  FROM public.outbound_autopilot_runs WHERE id = p_run_id;

  RETURN jsonb_build_object('success', true, 'run_id', p_run_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_pipeline_retry_run(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_pipeline_retry_run(uuid) TO authenticated;

-- ─── View: agents live (heartbeat health) ────────────────────────
CREATE OR REPLACE VIEW public.v_pipeline_agents_live
WITH (security_invoker = true)
AS
SELECT
  a.id,
  a.key AS agent_key,
  a.name AS agent_name,
  a.category AS agent_type,
  a.is_enabled,
  a.last_status,
  a.last_run_at,
  a.next_run_at,
  a.error_streak,
  a.priority,
  CASE
    WHEN NOT a.is_enabled THEN 'disabled'
    WHEN a.last_run_at IS NULL THEN 'never_ran'
    WHEN a.error_streak >= COALESCE(a.auto_pause_threshold, 5) THEN 'failing'
    WHEN a.last_run_at < (now() - interval '15 minutes') AND a.next_run_at < now() THEN 'stale'
    WHEN a.last_status = 'failed' THEN 'degraded'
    WHEN a.last_status = 'success' THEN 'healthy'
    ELSE 'unknown'
  END AS health_status,
  EXTRACT(EPOCH FROM (now() - COALESCE(a.last_run_at, a.created_at)))::int AS seconds_since_last_run
FROM public.automation_agents a;

GRANT SELECT ON public.v_pipeline_agents_live TO authenticated;
