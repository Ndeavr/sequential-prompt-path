-- 1. Canonical alias resolution
CREATE OR REPLACE FUNCTION public.canonical_plan_code(_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(_code, ''))
    WHEN 'recrue' THEN 'presence'
    WHEN 'elite' THEN 'premium'
    WHEN 'élite' THEN 'premium'
    WHEN 'signature' THEN 'domination'
    ELSE lower(coalesce(_code, ''))
  END
$$;

-- 2. Sync legacy plan_catalog to canonical pricing (single source = public.plans)
INSERT INTO public.plan_catalog (code, name, position_rank, monthly_price, annual_price, stripe_monthly_price_id, appointments_included, appointments_range_min, appointments_range_max, active, billing_mode)
SELECT p.code, p.name, p.tier_rank, p.monthly_price,
       round(p.monthly_price * 12 * 0.8)::int,
       p.stripe_monthly_price_id,
       coalesce(p.appointments_included, 0),
       0, greatest(coalesce(p.appointments_included, 0), 1),
       true, 'subscription'
FROM public.plans p
WHERE p.audience = 'contractor' AND p.active = true
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  position_rank = EXCLUDED.position_rank,
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  stripe_monthly_price_id = EXCLUDED.stripe_monthly_price_id,
  appointments_included = EXCLUDED.appointments_included,
  active = true,
  updated_at = now();

-- legacy codes mirror their canonical target so old lookups keep working with correct prices
UPDATE public.plan_catalog lc
SET monthly_price = t.monthly_price,
    annual_price = t.annual_price,
    stripe_monthly_price_id = t.stripe_monthly_price_id,
    appointments_included = t.appointments_included,
    active = false,
    updated_at = now()
FROM public.plan_catalog t
WHERE t.code = public.canonical_plan_code(lc.code)
  AND lc.code IN ('recrue', 'elite', 'signature');

-- 3. Entitlement denial log
CREATE TABLE IF NOT EXISTS public.entitlement_denials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  contractor_id uuid,
  feature_key text NOT NULL,
  plan_code text,
  reason text NOT NULL,
  limit_value integer,
  current_usage integer,
  surface text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.entitlement_denials TO authenticated;
GRANT ALL ON public.entitlement_denials TO service_role;
ALTER TABLE public.entitlement_denials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entitlement_denials_admin_read" ON public.entitlement_denials;
CREATE POLICY "entitlement_denials_admin_read" ON public.entitlement_denials
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_entitlement_denials_created ON public.entitlement_denials (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entitlement_denials_feature ON public.entitlement_denials (feature_key, created_at DESC);

-- 4. Subscription provenance
ALTER TABLE public.contractor_subscriptions
  ADD COLUMN IF NOT EXISTS plan_source text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS quote_id uuid,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- 5. Personalized quote approval trail
ALTER TABLE public.contractor_pricing_quotes
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_note text;

-- 6. Canonical plan code for a contractor user
CREATE OR REPLACE FUNCTION public.contractor_plan_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.canonical_plan_code(cs.plan_id)
  FROM public.contractors c
  JOIN public.contractor_subscriptions cs ON cs.contractor_id = c.id
  WHERE c.user_id = _user_id
    AND cs.status IN ('active', 'trialing', 'past_due')
  ORDER BY cs.updated_at DESC
  LIMIT 1
$$;

-- 7. Canonical server-side entitlement resolution
CREATE OR REPLACE FUNCTION public.contractor_feature_access(_user_id uuid, _feature_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_row public.plan_features%ROWTYPE;
  v_upgrade text;
BEGIN
  v_plan := public.contractor_plan_code(_user_id);

  IF v_plan IS NULL THEN
    SELECT pf.upgrade_target INTO v_upgrade
    FROM public.plan_features pf
    WHERE pf.feature_key = _feature_key AND pf.enabled = true
    ORDER BY pf.plan_code
    LIMIT 1;
    RETURN jsonb_build_object(
      'allowed', false, 'plan_code', null, 'limit', 0, 'unlimited', false,
      'reason', 'no_active_subscription',
      'upgrade_target', coalesce(v_upgrade, 'presence')
    );
  END IF;

  SELECT * INTO v_row
  FROM public.plan_features
  WHERE plan_code = v_plan AND feature_key = _feature_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false, 'plan_code', v_plan, 'limit', 0, 'unlimited', false,
      'reason', 'feature_not_in_plan', 'upgrade_target', null
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_row.enabled,
    'plan_code', v_plan,
    'limit', coalesce(v_row.limit_value, -1),
    'unlimited', coalesce(v_row.limit_value, -1) = -1,
    'reason', CASE WHEN v_row.enabled THEN 'granted' ELSE 'plan_too_low' END,
    'teaser', v_row.teaser_copy,
    'upgrade_target', v_row.upgrade_target
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contractor_feature_access(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.contractor_feature_access(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.contractor_plan_code(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.contractor_plan_code(uuid) TO authenticated, service_role;

-- 8. Admin observability view
CREATE OR REPLACE VIEW public.v_contractor_plan_state
WITH (security_invoker = true) AS
SELECT
  c.id AS contractor_id,
  c.user_id,
  c.business_name AS company_name,
  public.canonical_plan_code(cs.plan_id) AS plan_code,
  p.name AS plan_name,
  p.monthly_price AS plan_monthly_price_cents,
  cs.status AS subscription_status,
  cs.payment_status,
  cs.plan_source,
  cs.quote_id,
  cs.trial_ends_at,
  cs.current_period_end,
  cs.amount_paid_cents,
  cs.stripe_subscription_id,
  q.recommended_plan AS quote_plan,
  q.recommended_monthly_price AS quote_monthly_price,
  q.pricing_status AS quote_status,
  q.requires_approval AS quote_requires_approval,
  q.approved_at AS quote_approved_at,
  cs.updated_at
FROM public.contractors c
LEFT JOIN public.contractor_subscriptions cs ON cs.contractor_id = c.id
LEFT JOIN public.plans p ON p.code = public.canonical_plan_code(cs.plan_id) AND p.audience = 'contractor'
LEFT JOIN public.contractor_pricing_quotes q ON q.id = cs.quote_id;

GRANT SELECT ON public.v_contractor_plan_state TO authenticated;