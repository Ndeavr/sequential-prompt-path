
-- Launch War Room — Phase B/C/D/E schema additions

ALTER TABLE public.launch_mode_state
  ADD COLUMN IF NOT EXISTS last_blocker_agent TEXT,
  ADD COLUMN IF NOT EXISTS last_blocker_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_blocker_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scout_cursor JSONB DEFAULT '{"trade_idx":0,"city_idx":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS daily_email_cap INT NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS daily_sms_cap INT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS current_objective_label TEXT DEFAULT 'Premier client payant',
  ADD COLUMN IF NOT EXISTS current_stage_label TEXT,
  ADD COLUMN IF NOT EXISTS current_trade TEXT,
  ADD COLUMN IF NOT EXISTS current_city TEXT,
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_success_description TEXT;

ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS current_stage_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_stage_heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_stage_timeout_seconds INT,
  ADD COLUMN IF NOT EXISTS block_reason TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_launch_leads_stage_timeout
  ON public.launch_leads (current_stage_started_at)
  WHERE current_stage_started_at IS NOT NULL;

-- Mark leads whose stage exceeded its deadline as BLOCKED with an explicit reason
CREATE OR REPLACE FUNCTION public.mark_stale_launch_leads()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INT := 0;
BEGIN
  WITH stale AS (
    UPDATE public.launch_leads
       SET lead_status = 'BLOCKED',
           block_reason = COALESCE(block_reason, 'stage_timeout:' || lead_status),
           updated_at = now()
     WHERE current_stage_started_at IS NOT NULL
       AND current_stage_timeout_seconds IS NOT NULL
       AND lead_status NOT IN ('BLOCKED','FAILED','STOPPED','PAID','ACTIVATED','REPLIED','CHECKOUT_SENT','DELIVERED','MESSAGED')
       AND now() > current_stage_started_at + (current_stage_timeout_seconds || ' seconds')::interval
     RETURNING 1
  )
  SELECT count(*) INTO affected FROM stale;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_stale_launch_leads() TO service_role;
