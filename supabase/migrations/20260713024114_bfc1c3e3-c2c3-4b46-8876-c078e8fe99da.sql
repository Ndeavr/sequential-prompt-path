
CREATE OR REPLACE FUNCTION public.recover_blocked_launch_leads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
  v_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_role_required';
  END IF;

  WITH updated AS (
    UPDATE public.launch_leads
    SET lead_status = 'SCORED',
        block_reason = NULL,
        failure_code = NULL,
        retry_count = COALESCE(retry_count, 0) + 1,
        next_retry_at = NULL,
        current_stage_started_at = now(),
        current_stage_heartbeat_at = now(),
        updated_at = now()
    WHERE lead_status = 'BLOCKED'
      AND block_reason LIKE 'stage_timeout:%'
      AND phone IS NOT NULL
      AND sms_batch_id IS NULL
    RETURNING id
  )
  SELECT array_agg(id), count(*) INTO v_ids, v_count FROM updated;

  RETURN jsonb_build_object(
    'recovered_count', COALESCE(v_count, 0),
    'sample_ids', COALESCE((SELECT jsonb_agg(x) FROM unnest(v_ids[1:10]) x), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recover_blocked_launch_leads() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_blocked_launch_leads() TO authenticated;
