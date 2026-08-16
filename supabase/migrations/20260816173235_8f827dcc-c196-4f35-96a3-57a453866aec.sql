-- 1) Properties: active flag (read-only beyond plan limit, never deleted)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_properties_user_active ON public.properties(user_id, is_active);

-- 2) Monthly usage counters for homeowners
CREATE TABLE IF NOT EXISTS public.homeowner_usage_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_month date NOT NULL,
  feature_key text NOT NULL,
  used_count integer NOT NULL DEFAULT 0,
  last_idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homeowner_usage_monthly_unique UNIQUE (user_id, period_month, feature_key)
);

GRANT SELECT ON public.homeowner_usage_monthly TO authenticated;
GRANT ALL ON public.homeowner_usage_monthly TO service_role;

ALTER TABLE public.homeowner_usage_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own homeowner usage" ON public.homeowner_usage_monthly;
CREATE POLICY "Users read own homeowner usage"
  ON public.homeowner_usage_monthly FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all homeowner usage" ON public.homeowner_usage_monthly;
CREATE POLICY "Admins read all homeowner usage"
  ON public.homeowner_usage_monthly FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- idempotency ledger to make consumption safe against double clicks / retries
CREATE TABLE IF NOT EXISTS public.homeowner_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  idempotency_key text NOT NULL,
  period_month date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homeowner_usage_events_unique UNIQUE (user_id, feature_key, idempotency_key)
);

GRANT SELECT ON public.homeowner_usage_events TO authenticated;
GRANT ALL ON public.homeowner_usage_events TO service_role;

ALTER TABLE public.homeowner_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own homeowner usage events" ON public.homeowner_usage_events;
CREATE POLICY "Users read own homeowner usage events"
  ON public.homeowner_usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3) Resolve the active homeowner plan code for a user
CREATE OR REPLACE FUNCTION public.homeowner_active_plan_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE lower(s.plan_code)
               WHEN 'plus' THEN 'home_plus'
               WHEN 'homeowners_plus' THEN 'home_plus'
               WHEN 'home_plus' THEN 'home_plus'
               WHEN 'signature' THEN 'home_signature'
               WHEN 'gold' THEN 'home_signature'
               WHEN 'homeowners_signature' THEN 'home_signature'
               WHEN 'home_signature' THEN 'home_signature'
               ELSE 'home_decouverte'
             END
      FROM public.homeowner_subscriptions s
      WHERE s.user_id = _user_id
        AND s.status IN ('active','trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      ORDER BY s.updated_at DESC
      LIMIT 1
    ),
    'home_decouverte'
  );
$$;

-- 4) Limit lookup (-1 = unlimited, NULL = feature not configured)
CREATE OR REPLACE FUNCTION public.homeowner_feature_limit(_user_id uuid, _feature_key text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.limit_value
  FROM public.plan_features f
  WHERE f.plan_code = public.homeowner_active_plan_code(_user_id)
    AND f.feature_key = _feature_key
  LIMIT 1;
$$;

-- 5) Property capacity check (active properties only)
CREATE OR REPLACE FUNCTION public.homeowner_can_add_property(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text := public.homeowner_active_plan_code(_user_id);
  v_limit integer := public.homeowner_feature_limit(_user_id, 'properties_max');
  v_used integer;
  v_target text;
BEGIN
  SELECT count(*) INTO v_used
  FROM public.properties p
  WHERE p.user_id = _user_id AND COALESCE(p.is_active, true);

  SELECT upgrade_target INTO v_target
  FROM public.plan_features
  WHERE plan_code = v_plan AND feature_key = 'properties_max'
  LIMIT 1;

  IF v_limit IS NULL OR v_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'plan_code', v_plan, 'limit', v_limit, 'used', v_used, 'unlimited', true);
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_used < v_limit,
    'plan_code', v_plan,
    'limit', v_limit,
    'used', v_used,
    'unlimited', false,
    'upgrade_target', v_target
  );
END;
$$;

-- 6) Atomic, idempotent monthly quota consumption
CREATE OR REPLACE FUNCTION public.homeowner_consume_quota(
  _user_id uuid,
  _feature_key text,
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text := public.homeowner_active_plan_code(_user_id);
  v_limit integer := public.homeowner_feature_limit(_user_id, _feature_key);
  v_period date := date_trunc('month', (now() AT TIME ZONE 'America/Toronto'))::date;
  v_used integer := 0;
  v_target text;
  v_inserted boolean := false;
BEGIN
  SELECT upgrade_target INTO v_target
  FROM public.plan_features
  WHERE plan_code = v_plan AND feature_key = _feature_key
  LIMIT 1;

  -- unlimited or unconfigured: never block, never count
  IF v_limit IS NULL OR v_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'plan_code', v_plan,
                              'limit', v_limit, 'used', 0, 'remaining', -1);
  END IF;

  -- idempotency: a repeated key does not consume twice
  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.homeowner_usage_events (user_id, feature_key, idempotency_key, period_month)
    VALUES (_user_id, _feature_key, _idempotency_key, v_period)
    ON CONFLICT (user_id, feature_key, idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    IF NOT v_inserted THEN
      SELECT used_count INTO v_used
      FROM public.homeowner_usage_monthly
      WHERE user_id = _user_id AND period_month = v_period AND feature_key = _feature_key;

      RETURN jsonb_build_object('allowed', true, 'unlimited', false, 'replayed', true,
                                'plan_code', v_plan, 'limit', v_limit,
                                'used', COALESCE(v_used, 0),
                                'remaining', GREATEST(v_limit - COALESCE(v_used, 0), 0));
    END IF;
  END IF;

  INSERT INTO public.homeowner_usage_monthly (user_id, period_month, feature_key, used_count, last_idempotency_key)
  VALUES (_user_id, v_period, _feature_key, 0, _idempotency_key)
  ON CONFLICT (user_id, period_month, feature_key) DO NOTHING;

  SELECT used_count INTO v_used
  FROM public.homeowner_usage_monthly
  WHERE user_id = _user_id AND period_month = v_period AND feature_key = _feature_key
  FOR UPDATE;

  IF COALESCE(v_used, 0) >= v_limit THEN
    -- release the idempotency slot so a later retry after upgrade can succeed
    IF _idempotency_key IS NOT NULL THEN
      DELETE FROM public.homeowner_usage_events
      WHERE user_id = _user_id AND feature_key = _feature_key AND idempotency_key = _idempotency_key;
    END IF;

    RETURN jsonb_build_object('allowed', false, 'unlimited', false, 'plan_code', v_plan,
                              'limit', v_limit, 'used', v_used, 'remaining', 0,
                              'upgrade_target', v_target);
  END IF;

  UPDATE public.homeowner_usage_monthly
  SET used_count = used_count + 1,
      last_idempotency_key = COALESCE(_idempotency_key, last_idempotency_key),
      updated_at = now()
  WHERE user_id = _user_id AND period_month = v_period AND feature_key = _feature_key
  RETURNING used_count INTO v_used;

  RETURN jsonb_build_object('allowed', true, 'unlimited', false, 'plan_code', v_plan,
                            'limit', v_limit, 'used', v_used,
                            'remaining', GREATEST(v_limit - v_used, 0));
END;
$$;

-- 7) Read-only usage snapshot for the current user (drives UI counters)
CREATE OR REPLACE FUNCTION public.homeowner_usage_snapshot(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text := public.homeowner_active_plan_code(_user_id);
  v_period date := date_trunc('month', (now() AT TIME ZONE 'America/Toronto'))::date;
  v_props integer;
BEGIN
  SELECT count(*) INTO v_props
  FROM public.properties p
  WHERE p.user_id = _user_id AND COALESCE(p.is_active, true);

  RETURN jsonb_build_object(
    'plan_code', v_plan,
    'period_month', v_period,
    'properties_used', v_props,
    'properties_max', public.homeowner_feature_limit(_user_id, 'properties_max'),
    'quote_analysis_limit', public.homeowner_feature_limit(_user_id, 'quote_analysis_monthly'),
    'quote_analysis_used', COALESCE((SELECT used_count FROM public.homeowner_usage_monthly
      WHERE user_id = _user_id AND period_month = v_period AND feature_key = 'quote_analysis_monthly'), 0),
    'ai_design_limit', public.homeowner_feature_limit(_user_id, 'ai_design_monthly'),
    'ai_design_used', COALESCE((SELECT used_count FROM public.homeowner_usage_monthly
      WHERE user_id = _user_id AND period_month = v_period AND feature_key = 'ai_design_monthly'), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.homeowner_can_add_property(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.homeowner_usage_snapshot(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.homeowner_consume_quota(uuid, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.homeowner_consume_quota(uuid, text, text) FROM authenticated, anon;

-- 8) Server-side guard: block inserting an active property beyond the plan limit
CREATE OR REPLACE FUNCTION public.enforce_homeowner_property_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
BEGIN
  IF NEW.user_id IS NULL OR NOT COALESCE(NEW.is_active, true) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_active, true) = true THEN
    RETURN NEW;
  END IF;

  v_check := public.homeowner_can_add_property(NEW.user_id);

  IF NOT (v_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'HOMEOWNER_PROPERTY_LIMIT_REACHED: plan %, limite % propriété(s)',
      v_check->>'plan_code', v_check->>'limit'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_homeowner_property_limit ON public.properties;
CREATE TRIGGER trg_enforce_homeowner_property_limit
  BEFORE INSERT OR UPDATE OF is_active ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_homeowner_property_limit();