
-- 1. CONTROLS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruitment_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  global_enabled boolean NOT NULL DEFAULT false,
  autonomous_enqueue_enabled boolean NOT NULL DEFAULT false,
  sms_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  affiliate_assignment_enabled boolean NOT NULL DEFAULT false,
  retries_enabled boolean NOT NULL DEFAULT true,
  max_daily_global integer NOT NULL DEFAULT 25,
  max_daily_per_city_category integer NOT NULL DEFAULT 10,
  max_daily_per_channel integer NOT NULL DEFAULT 25,
  prospect_cooldown_days integer NOT NULL DEFAULT 30,
  lock_ttl_seconds integer NOT NULL DEFAULT 900,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recruitment_controls TO authenticated;
GRANT ALL ON public.recruitment_controls TO service_role;
ALTER TABLE public.recruitment_controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read recruitment controls" ON public.recruitment_controls;
CREATE POLICY "admins read recruitment controls" ON public.recruitment_controls
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.recruitment_controls (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- 2. RUN REGISTRY -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruitment_runs (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  city text,
  category text,
  channel text,
  requested_limit integer NOT NULL DEFAULT 0,
  claimed_count integer NOT NULL DEFAULT 0,
  eligible_count integer NOT NULL DEFAULT 0,
  queued_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  compliance_blocked_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  lock_key text,
  idempotency_key text UNIQUE,
  source text NOT NULL DEFAULT 'admin',
  requested_by text,
  delegated_function text,
  delegated_run_id text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_summary text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recruitment_runs TO authenticated;
GRANT ALL ON public.recruitment_runs TO service_role;
ALTER TABLE public.recruitment_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read recruitment runs" ON public.recruitment_runs;
CREATE POLICY "admins read recruitment runs" ON public.recruitment_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_recruitment_runs_started ON public.recruitment_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruitment_runs_city_cat ON public.recruitment_runs (city, category, started_at DESC);

-- 3. RUN ITEMS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruitment_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.recruitment_runs(run_id) ON DELETE CASCADE,
  prospect_id uuid,
  contractor_lead_id uuid,
  business_name text,
  city text,
  category text,
  phone_e164 text,
  channel text,
  stage text NOT NULL,
  status text NOT NULL,
  reason_code text,
  reason_text text,
  idempotency_key text,
  lock_key text,
  existing_queue_id text,
  existing_campaign_id text,
  provider_id text,
  edge_function text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recruitment_run_items TO authenticated;
GRANT ALL ON public.recruitment_run_items TO service_role;
ALTER TABLE public.recruitment_run_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read recruitment run items" ON public.recruitment_run_items;
CREATE POLICY "admins read recruitment run items" ON public.recruitment_run_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX IF NOT EXISTS uniq_recruitment_item_idem
  ON public.recruitment_run_items (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recruitment_items_run ON public.recruitment_run_items (run_id);

-- 4. LOCKS --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruitment_orchestrator_locks (
  lock_key text PRIMARY KEY,
  owner_run_id uuid,
  owner_label text,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz
);
GRANT SELECT ON public.recruitment_orchestrator_locks TO authenticated;
GRANT ALL ON public.recruitment_orchestrator_locks TO service_role;
ALTER TABLE public.recruitment_orchestrator_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read recruitment locks" ON public.recruitment_orchestrator_locks;
CREATE POLICY "admins read recruitment locks" ON public.recruitment_orchestrator_locks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_recruitment_lock(
  p_lock_key text, p_run_id uuid, p_owner_label text, p_ttl_seconds integer DEFAULT 900
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing record; v_now timestamptz := now();
BEGIN
  SELECT * INTO existing FROM public.recruitment_orchestrator_locks
    WHERE lock_key = p_lock_key FOR UPDATE;
  IF FOUND AND existing.released_at IS NULL AND existing.expires_at > v_now THEN
    RETURN jsonb_build_object('acquired', false, 'owner_run_id', existing.owner_run_id,
      'owner_label', existing.owner_label, 'expires_at', existing.expires_at);
  END IF;
  INSERT INTO public.recruitment_orchestrator_locks
    (lock_key, owner_run_id, owner_label, acquired_at, expires_at, released_at)
  VALUES (p_lock_key, p_run_id, p_owner_label, v_now, v_now + make_interval(secs => p_ttl_seconds), NULL)
  ON CONFLICT (lock_key) DO UPDATE
    SET owner_run_id = EXCLUDED.owner_run_id, owner_label = EXCLUDED.owner_label,
        acquired_at = EXCLUDED.acquired_at, expires_at = EXCLUDED.expires_at, released_at = NULL;
  RETURN jsonb_build_object('acquired', true, 'owner_run_id', p_run_id,
    'expires_at', v_now + make_interval(secs => p_ttl_seconds));
END; $$;
REVOKE ALL ON FUNCTION public.claim_recruitment_lock(text, uuid, text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_recruitment_lock(text, uuid, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.release_recruitment_lock(p_lock_key text, p_run_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.recruitment_orchestrator_locks
    SET released_at = now()
    WHERE lock_key = p_lock_key AND (owner_run_id = p_run_id OR owner_run_id IS NULL);
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.release_recruitment_lock(text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_recruitment_lock(text, uuid) TO service_role;

-- 5. COVERAGE GAP SCORING (real data only) ------------------------------
CREATE OR REPLACE VIEW public.v_recruitment_coverage_gaps
WITH (security_invoker = true) AS
SELECT
  md.city,
  md.category,
  md.homeowner_count,
  md.total_projects,
  md.estimated_revenue,
  md.avg_urgency,
  md.supply_count,
  md.gap_score,
  md.pressure_score,
  md.last_signal_at,
  crt.waiting_count,
  crt.priority_score AS target_priority_score,
  ROUND(
    (COALESCE(md.gap_score, 0) * 0.35)
    + (LEAST(COALESCE(md.homeowner_count, 0), 100) * 0.25)
    + (GREATEST(0, 20 - COALESCE(md.supply_count, 0)) * 1.5)
    + (LEAST(COALESCE(md.estimated_revenue, 0) / 10000.0, 20) * 0.5)
    + (COALESCE(md.avg_urgency, 0) * 2.0)
  , 2) AS opportunity_score,
  jsonb_build_object(
    'gap_score', md.gap_score,
    'homeowner_demand', md.homeowner_count,
    'supply_shortage', GREATEST(0, 20 - COALESCE(md.supply_count, 0)),
    'revenue_value', md.estimated_revenue,
    'urgency', md.avg_urgency,
    'waiting_count', crt.waiting_count
  ) AS score_reasons
FROM public.market_demand md
LEFT JOIN public.contractor_recruitment_targets crt
  ON lower(crt.city) = lower(md.city) AND lower(crt.category) = lower(md.category);
GRANT SELECT ON public.v_recruitment_coverage_gaps TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_recruitment_runs_updated ON public.recruitment_runs;
CREATE TRIGGER trg_recruitment_runs_updated BEFORE UPDATE ON public.recruitment_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_recruitment_controls_updated ON public.recruitment_controls;
CREATE TRIGGER trg_recruitment_controls_updated BEFORE UPDATE ON public.recruitment_controls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
