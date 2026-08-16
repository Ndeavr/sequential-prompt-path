-- 1) Daily usage counters (anti-abuse guardrail, coexists with monthly plan quotas)
CREATE TABLE IF NOT EXISTS public.homeowner_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_day date NOT NULL,
  feature_key text NOT NULL,
  used_count integer NOT NULL DEFAULT 0,
  last_idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homeowner_usage_daily_unique UNIQUE (user_id, usage_day, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_homeowner_usage_daily_user_day
  ON public.homeowner_usage_daily(user_id, usage_day);

GRANT SELECT ON public.homeowner_usage_daily TO authenticated;
GRANT ALL ON public.homeowner_usage_daily TO service_role;

ALTER TABLE public.homeowner_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own homeowner daily usage" ON public.homeowner_usage_daily;
CREATE POLICY "Users read own homeowner daily usage"
  ON public.homeowner_usage_daily FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all homeowner daily usage" ON public.homeowner_usage_daily;
CREATE POLICY "Admins read all homeowner daily usage"
  ON public.homeowner_usage_daily FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Configurable daily caps (data, not code): default 3 per day for every homeowner plan
INSERT INTO public.plan_features (plan_code, feature_key, enabled, limit_value, teaser_copy, upgrade_target) VALUES
  ('home_decouverte','quote_analysis_daily',true,3,NULL,NULL),
  ('home_plus','quote_analysis_daily',true,3,NULL,NULL),
  ('home_signature','quote_analysis_daily',true,3,NULL,NULL),
  ('home_decouverte','ai_design_daily',true,3,NULL,NULL),
  ('home_plus','ai_design_daily',true,3,NULL,NULL),
  ('home_signature','ai_design_daily',true,3,NULL,NULL)
ON CONFLICT (plan_code, feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value;

-- 3) Map a monthly feature key to its daily guardrail key
CREATE OR REPLACE FUNCTION public.homeowner_daily_feature_key(_feature_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _feature_key
           WHEN 'quote_analysis_monthly' THEN 'quote_analysis_daily'
           WHEN 'ai_design_monthly' THEN 'ai_design_daily'
           ELSE NULL
         END;
$$;

-- 4) Non-consuming check: monthly quota + daily guardrail (most restrictive wins)
CREATE OR REPLACE FUNCTION public.homeowner_quota_check(_user_id uuid, _feature_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text := public.homeowner_active_plan_code(_user_id);
  v_limit integer := public.homeowner_feature_limit(_user_id, _feature_key);
  v_daily_key text := public.homeowner_daily_feature_key(_feature_key);
  v_daily_limit integer;
  v_period date := date_trunc('month', (now() AT TIME ZONE 'America/Toronto'))::date;
  v_day date := (now() AT TIME ZONE 'America/Toronto')::date;
  v_used integer := 0;
  v_daily_used integer := 0;
  v_target text;
BEGIN
  IF v_daily_key IS NOT NULL THEN
    v_daily_limit := COALESCE(public.homeowner_feature_limit(_user_id, v_daily_key), 3);
    IF v_daily_limit = -1 THEN v_daily_limit := NULL; END IF;

    SELECT used_count INTO v_daily_used
    FROM public.homeowner_usage_daily
    WHERE user_id = _user_id AND usage_day = v_day AND feature_key = v_daily_key;
    v_daily_used := COALESCE(v_daily_used, 0);
  END IF;

  SELECT upgrade_target INTO v_target
  FROM public.plan_features
  WHERE plan_code = v_plan AND feature_key = _feature_key
  LIMIT 1;

  SELECT used_count INTO v_used
  FROM public.homeowner_usage_monthly
  WHERE user_id = _user_id AND period_month = v_period AND feature_key = _feature_key;
  v_used := COALESCE(v_used, 0);

  -- monthly first (commercial limit), then the invisible daily guardrail
  IF v_limit IS NOT NULL AND v_limit <> -1 AND v_used >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'blocked_by', 'monthly', 'plan_code', v_plan,
      'limit', v_limit, 'used', v_used, 'remaining', 0, 'unlimited', false,
      'daily_limit', v_daily_limit, 'daily_used', v_daily_used, 'upgrade_target', v_target);
  END IF;

  IF v_daily_limit IS NOT NULL AND v_daily_used >= v_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'blocked_by', 'daily', 'plan_code', v_plan,
      'limit', v_limit, 'used', v_used, 'remaining', 0,
      'unlimited', (v_limit IS NULL OR v_limit = -1),
      'daily_limit', v_daily_limit, 'daily_used', v_daily_used, 'upgrade_target', v_target);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'blocked_by', NULL, 'plan_code', v_plan,
    'limit', v_limit, 'used', v_used,
    'remaining', CASE WHEN v_limit IS NULL OR v_limit = -1 THEN -1 ELSE GREATEST(v_limit - v_used, 0) END,
    'unlimited', (v_limit IS NULL OR v_limit = -1),
    'daily_limit', v_daily_limit, 'daily_used', v_daily_used, 'upgrade_target', v_target);
END;
$$;

-- 5) Consumption: idempotent, atomic, monthly + daily in one transaction
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
  v_daily_key text := public.homeowner_daily_feature_key(_feature_key);
  v_daily_limit integer;
  v_period date := date_trunc('month', (now() AT TIME ZONE 'America/Toronto'))::date;
  v_day date := (now() AT TIME ZONE 'America/Toronto')::date;
  v_used integer := 0;
  v_daily_used integer := 0;
  v_target text;
  v_inserted boolean := false;
BEGIN
  IF v_daily_key IS NOT NULL THEN
    v_daily_limit := COALESCE(public.homeowner_feature_limit(_user_id, v_daily_key), 3);
    IF v_daily_limit = -1 THEN v_daily_limit := NULL; END IF;
  END IF;

  SELECT upgrade_target INTO v_target
  FROM public.plan_features
  WHERE plan_code = v_plan AND feature_key = _feature_key
  LIMIT 1;

  -- Idempotency: a replayed key never consumes twice (monthly nor daily)
  IF _idempotency_key IS NOT NULL THEN
    INSERT INTO public.homeowner_usage_events (user_id, feature_key, idempotency_key, period_month)
    VALUES (_user_id, _feature_key, _idempotency_key, v_period)
    ON CONFLICT (user_id, feature_key, idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    IF NOT v_inserted THEN
      SELECT COALESCE(used_count, 0) INTO v_used
      FROM public.homeowner_usage_monthly
      WHERE user_id = _user_id AND period_month = v_period AND feature_key = _feature_key;

      IF v_daily_key IS NOT NULL THEN
        SELECT COALESCE(used_count, 0) INTO v_daily_used
        FROM public.homeowner_usage_daily
        WHERE user_id = _user_id AND usage_day = v_day AND feature_key = v_daily_key;
      END IF;

      RETURN jsonb_build_object('allowed', true, 'replayed', true, 'blocked_by', NULL,
        'unlimited', (v_limit IS NULL OR v_limit = -1), 'plan_code', v_plan,
        'limit', v_limit, 'used', COALESCE(v_used, 0),
        'remaining', CASE WHEN v_limit IS NULL OR v_limit = -1 THEN -1
                          ELSE GREATEST(v_limit - COALESCE(v_used, 0), 0) END,
        'daily_limit', v_daily_limit, 'daily_used', COALESCE(v_daily_used, 0));
    END IF;
  END IF;

  -- Monthly row lock (only when the plan has a finite monthly limit)
  IF v_limit IS NOT NULL AND v_limit <> -1 THEN
    INSERT INTO public.homeowner_usage_monthly (user_id, period_month, feature_key, used_count, last_idempotency_key)
    VALUES (_user_id, v_period, _feature_key, 0, _idempotency_key)
    ON CONFLICT (user_id, period_month, feature_key) DO NOTHING;

    SELECT used_count INTO v_used
    FROM public.homeowner_usage_monthly
    WHERE user_id = _user_id AND period_month = v_period AND feature_key = _feature_key
    FOR UPDATE;
    v_used := COALESCE(v_used, 0);

    IF v_used >= v_limit THEN
      IF _idempotency_key IS NOT NULL THEN
        DELETE FROM public.homeowner_usage_events
        WHERE user_id = _user_id AND feature_key = _feature_key AND idempotency_key = _idempotency_key;
      END IF;
      RETURN jsonb_build_object('allowed', false, 'blocked_by', 'monthly', 'unlimited', false,
        'plan_code', v_plan, 'limit', v_limit, 'used', v_used, 'remaining', 0,
        'daily_limit', v_daily_limit, 'daily_used', v_daily_used, 'upgrade_target', v_target);
    END IF;
  END IF;

  -- Daily guardrail (applies to every plan, including "unlimited")
  IF v_daily_key IS NOT NULL AND v_daily_limit IS NOT NULL THEN
    INSERT INTO public.homeowner_usage_daily (user_id, usage_day, feature_key, used_count, last_idempotency_key)
    VALUES (_user_id, v_day, v_daily_key, 0, _idempotency_key)
    ON CONFLICT (user_id, usage_day, feature_key) DO NOTHING;

    SELECT used_count INTO v_daily_used
    FROM public.homeowner_usage_daily
    WHERE user_id = _user_id AND usage_day = v_day AND feature_key = v_daily_key
    FOR UPDATE;
    v_daily_used := COALESCE(v_daily_used, 0);

    IF v_daily_used >= v_daily_limit THEN
      IF _idempotency_key IS NOT NULL THEN
        DELETE FROM public.homeowner_usage_events
        WHERE user_id = _user_id AND feature_key = _feature_key AND idempotency_key = _idempotency_key;
      END IF;
      RETURN jsonb_build_object('allowed', false, 'blocked_by', 'daily',
        'unlimited', (v_limit IS NULL OR v_limit = -1), 'plan_code', v_plan,
        'limit', v_limit, 'used', v_used, 'remaining', 0,
        'daily_limit', v_daily_limit, 'daily_used', v_daily_used, 'upgrade_target', v_target);
    END IF;

    UPDATE public.homeowner_usage_daily
    SET used_count = used_count + 1,
        last_idempotency_key = COALESCE(_idempotency_key, last_idempotency_key),
        updated_at = now()
    WHERE user_id = _user_id AND usage_day = v_day AND feature_key = v_daily_key
    RETURNING used_count INTO v_daily_used;
  END IF;

  IF v_limit IS NOT NULL AND v_limit <> -1 THEN
    UPDATE public.homeowner_usage_monthly
    SET used_count = used_count + 1,
        last_idempotency_key = COALESCE(_idempotency_key, last_idempotency_key),
        updated_at = now()
    WHERE user_id = _user_id AND period_month = v_period AND feature_key = _feature_key
    RETURNING used_count INTO v_used;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'blocked_by', NULL,
    'unlimited', (v_limit IS NULL OR v_limit = -1), 'plan_code', v_plan,
    'limit', v_limit, 'used', v_used,
    'remaining', CASE WHEN v_limit IS NULL OR v_limit = -1 THEN -1 ELSE GREATEST(v_limit - v_used, 0) END,
    'daily_limit', v_daily_limit, 'daily_used', v_daily_used);
END;
$$;

-- 6) Usage snapshot extended with today's counters (backward compatible)
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
  v_day date := (now() AT TIME ZONE 'America/Toronto')::date;
  v_props integer;
  v_analysis_daily integer := COALESCE(public.homeowner_feature_limit(_user_id, 'quote_analysis_daily'), 3);
  v_design_daily integer := COALESCE(public.homeowner_feature_limit(_user_id, 'ai_design_daily'), 3);
  v_analysis_today integer;
  v_design_today integer;
BEGIN
  SELECT count(*) INTO v_props
  FROM public.properties p
  WHERE p.user_id = _user_id AND COALESCE(p.is_active, true);

  SELECT COALESCE(used_count, 0) INTO v_analysis_today
  FROM public.homeowner_usage_daily
  WHERE user_id = _user_id AND usage_day = v_day AND feature_key = 'quote_analysis_daily';

  SELECT COALESCE(used_count, 0) INTO v_design_today
  FROM public.homeowner_usage_daily
  WHERE user_id = _user_id AND usage_day = v_day AND feature_key = 'ai_design_daily';

  v_analysis_today := COALESCE(v_analysis_today, 0);
  v_design_today := COALESCE(v_design_today, 0);

  RETURN jsonb_build_object(
    'plan_code', v_plan,
    'period_month', v_period,
    'usage_day', v_day,
    'properties_used', v_props,
    'properties_max', public.homeowner_feature_limit(_user_id, 'properties_max'),
    'quote_analysis_limit', public.homeowner_feature_limit(_user_id, 'quote_analysis_monthly'),
    'quote_analysis_used', COALESCE((SELECT used_count FROM public.homeowner_usage_monthly
      WHERE user_id = _user_id AND period_month = v_period AND feature_key = 'quote_analysis_monthly'), 0),
    'ai_design_limit', public.homeowner_feature_limit(_user_id, 'ai_design_monthly'),
    'ai_design_used', COALESCE((SELECT used_count FROM public.homeowner_usage_monthly
      WHERE user_id = _user_id AND period_month = v_period AND feature_key = 'ai_design_monthly'), 0),
    'quote_analysis_daily_limit', v_analysis_daily,
    'quote_analysis_today', v_analysis_today,
    'quote_analysis_daily_blocked', (v_analysis_daily <> -1 AND v_analysis_today >= v_analysis_daily),
    'ai_design_daily_limit', v_design_daily,
    'ai_design_today', v_design_today,
    'ai_design_daily_blocked', (v_design_daily <> -1 AND v_design_today >= v_design_daily)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.homeowner_quota_check(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.homeowner_daily_feature_key(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.homeowner_consume_quota(uuid, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.homeowner_consume_quota(uuid, text, text) FROM authenticated, anon;

-- 7) Admin observability view
CREATE OR REPLACE VIEW public.v_homeowner_usage_admin
WITH (security_invoker = true) AS
SELECT
  u.user_id,
  public.homeowner_active_plan_code(u.user_id) AS plan_code,
  (now() AT TIME ZONE 'America/Toronto')::date AS usage_day,
  COALESCE(da.used_count, 0) AS analyses_today,
  COALESCE(dd.used_count, 0) AS designs_today,
  COALESCE(public.homeowner_feature_limit(u.user_id, 'quote_analysis_daily'), 3) AS analyses_daily_limit,
  COALESCE(public.homeowner_feature_limit(u.user_id, 'ai_design_daily'), 3) AS designs_daily_limit,
  COALESCE(ma.used_count, 0) AS analyses_month,
  COALESCE(md.used_count, 0) AS designs_month,
  public.homeowner_feature_limit(u.user_id, 'quote_analysis_monthly') AS analyses_month_limit,
  public.homeowner_feature_limit(u.user_id, 'ai_design_monthly') AS designs_month_limit,
  (COALESCE(da.used_count, 0) >= COALESCE(public.homeowner_feature_limit(u.user_id, 'quote_analysis_daily'), 3)) AS analyses_daily_blocked,
  (COALESCE(dd.used_count, 0) >= COALESCE(public.homeowner_feature_limit(u.user_id, 'ai_design_daily'), 3)) AS designs_daily_blocked
FROM (
  SELECT DISTINCT user_id FROM public.homeowner_usage_daily
  UNION
  SELECT DISTINCT user_id FROM public.homeowner_usage_monthly
) u
LEFT JOIN public.homeowner_usage_daily da
  ON da.user_id = u.user_id AND da.feature_key = 'quote_analysis_daily'
  AND da.usage_day = (now() AT TIME ZONE 'America/Toronto')::date
LEFT JOIN public.homeowner_usage_daily dd
  ON dd.user_id = u.user_id AND dd.feature_key = 'ai_design_daily'
  AND dd.usage_day = (now() AT TIME ZONE 'America/Toronto')::date
LEFT JOIN public.homeowner_usage_monthly ma
  ON ma.user_id = u.user_id AND ma.feature_key = 'quote_analysis_monthly'
  AND ma.period_month = date_trunc('month', (now() AT TIME ZONE 'America/Toronto'))::date
LEFT JOIN public.homeowner_usage_monthly md
  ON md.user_id = u.user_id AND md.feature_key = 'ai_design_monthly'
  AND md.period_month = date_trunc('month', (now() AT TIME ZONE 'America/Toronto'))::date;

GRANT SELECT ON public.v_homeowner_usage_admin TO authenticated, service_role;