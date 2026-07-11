
-- 1) Extend contractor_subscriptions
ALTER TABLE public.contractor_subscriptions
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','refunded','pending')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe','manual','free')),
  ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS activated_by UUID,
  ADD COLUMN IF NOT EXISTS activation_note TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT false;

-- 2) contractor_entitlements
CREATE TABLE IF NOT EXISTS public.contractor_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL UNIQUE REFERENCES public.contractors(id) ON DELETE CASCADE,
  can_receive_appointments BOOLEAN NOT NULL DEFAULT false,
  can_be_matched BOOLEAN NOT NULL DEFAULT false,
  public_profile_enabled BOOLEAN NOT NULL DEFAULT false,
  priority_matching TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority_matching IN ('normal','elevated','exclusive')),
  verified_badge BOOLEAN NOT NULL DEFAULT false,
  premium_badge BOOLEAN NOT NULL DEFAULT false,
  appointment_quota INTEGER,
  territory_limit INTEGER,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_entitlements TO authenticated;
GRANT ALL ON public.contractor_entitlements TO service_role;
ALTER TABLE public.contractor_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage entitlements" ON public.contractor_entitlements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Contractors read own entitlements" ON public.contractor_entitlements
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = contractor_entitlements.contractor_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Service manages entitlements" ON public.contractor_entitlements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3) contractor_matching_status
CREATE TABLE IF NOT EXISTS public.contractor_matching_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL UNIQUE REFERENCES public.contractors(id) ON DELETE CASCADE,
  is_eligible BOOLEAN NOT NULL DEFAULT false,
  eligibility_reason TEXT,
  capacity_status TEXT NOT NULL DEFAULT 'available'
    CHECK (capacity_status IN ('available','busy','full','paused')),
  accepting_new_projects BOOLEAN NOT NULL DEFAULT true,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_matching_status TO authenticated;
GRANT ALL ON public.contractor_matching_status TO service_role;
ALTER TABLE public.contractor_matching_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage matching status" ON public.contractor_matching_status
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Contractors read own matching status" ON public.contractor_matching_status
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = contractor_matching_status.contractor_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Service manages matching status" ON public.contractor_matching_status
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4) admin_activation_logs
CREATE TABLE IF NOT EXISTS public.admin_activation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  admin_user_id UUID,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','failure','rollback','partial')),
  before_state JSONB DEFAULT '{}'::jsonb,
  after_state JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_activation_logs TO authenticated;
GRANT ALL ON public.admin_activation_logs TO service_role;
ALTER TABLE public.admin_activation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read activation logs" ON public.admin_activation_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service manages activation logs" ON public.admin_activation_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_activation_logs_contractor
  ON public.admin_activation_logs(contractor_id, created_at DESC);

-- 5) updated_at trigger reuse (function should already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
    CREATE FUNCTION public.set_updated_at_timestamp() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path = public AS $fn$
      BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $fn$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_entitlements_updated ON public.contractor_entitlements;
CREATE TRIGGER trg_entitlements_updated
  BEFORE UPDATE ON public.contractor_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_matching_status_updated ON public.contractor_matching_status;
CREATE TRIGGER trg_matching_status_updated
  BEFORE UPDATE ON public.contractor_matching_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 6) Alex-eligible view: independent of Stripe
CREATE OR REPLACE VIEW public.v_contractor_alex_eligible
WITH (security_invoker = true) AS
SELECT
  c.id AS contractor_id,
  c.slug,
  c.business_name,
  c.city,
  c.aipp_score,
  s.plan_id,
  s.payment_method,
  s.current_period_end AS expires_at,
  e.priority_matching,
  m.capacity_status
FROM public.contractors c
JOIN public.contractor_subscriptions s ON s.contractor_id = c.id
JOIN public.contractor_entitlements e ON e.contractor_id = c.id
JOIN public.contractor_matching_status m ON m.contractor_id = c.id
WHERE
  c.account_status = 'active'
  AND s.status = 'active'
  AND s.payment_status = 'paid'
  AND (s.current_period_end IS NULL OR s.current_period_end > now())
  AND e.can_be_matched = true
  AND m.is_eligible = true
  AND m.accepting_new_projects = true;

GRANT SELECT ON public.v_contractor_alex_eligible TO authenticated, service_role, anon;

-- 7) Atomic finalize function (called by edge function after contractor insert)
CREATE OR REPLACE FUNCTION public.admin_activate_contractor_finalize(
  p_contractor_id UUID,
  p_admin_user_id UUID,
  p_plan_code TEXT,
  p_amount_paid_cents INTEGER,
  p_currency TEXT,
  p_starts_at TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ,
  p_payment_method TEXT,
  p_activation_note TEXT,
  p_visible_public BOOLEAN,
  p_receives_appointments BOOLEAN,
  p_can_be_matched BOOLEAN,
  p_priority_matching TEXT,
  p_unpro_verified BOOLEAN,
  p_premium_badge BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
  v_ent_id UUID;
  v_match_id UUID;
  v_log_id UUID;
  v_before JSONB;
  v_after JSONB;
BEGIN
  -- Snapshot BEFORE
  SELECT jsonb_build_object(
    'subscription', (SELECT to_jsonb(s) FROM contractor_subscriptions s WHERE s.contractor_id = p_contractor_id),
    'entitlements', (SELECT to_jsonb(e) FROM contractor_entitlements e WHERE e.contractor_id = p_contractor_id),
    'matching_status', (SELECT to_jsonb(m) FROM contractor_matching_status m WHERE m.contractor_id = p_contractor_id)
  ) INTO v_before;

  -- Subscription upsert
  INSERT INTO contractor_subscriptions (
    contractor_id, plan_id, status, billing_interval,
    current_period_start, current_period_end,
    activation_source, payment_status, payment_method,
    amount_paid_cents, currency, activated_by, activation_note, auto_renew
  ) VALUES (
    p_contractor_id, p_plan_code, 'active', 'year',
    p_starts_at, p_expires_at,
    CASE WHEN p_payment_method = 'manual' THEN 'admin_manual' ELSE 'stripe' END,
    'paid', p_payment_method,
    COALESCE(p_amount_paid_cents, 0), COALESCE(p_currency, 'CAD'),
    p_admin_user_id, p_activation_note, false
  )
  ON CONFLICT (contractor_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    billing_interval = EXCLUDED.billing_interval,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    activation_source = EXCLUDED.activation_source,
    payment_status = 'paid',
    payment_method = EXCLUDED.payment_method,
    amount_paid_cents = EXCLUDED.amount_paid_cents,
    currency = EXCLUDED.currency,
    activated_by = EXCLUDED.activated_by,
    activation_note = EXCLUDED.activation_note,
    auto_renew = false,
    updated_at = now()
  RETURNING id INTO v_sub_id;

  -- Entitlements upsert
  INSERT INTO contractor_entitlements (
    contractor_id, can_receive_appointments, can_be_matched, public_profile_enabled,
    priority_matching, verified_badge, premium_badge, valid_until
  ) VALUES (
    p_contractor_id, p_receives_appointments, p_can_be_matched, p_visible_public,
    COALESCE(p_priority_matching, 'normal'), p_unpro_verified, p_premium_badge, p_expires_at
  )
  ON CONFLICT (contractor_id) DO UPDATE SET
    can_receive_appointments = EXCLUDED.can_receive_appointments,
    can_be_matched = EXCLUDED.can_be_matched,
    public_profile_enabled = EXCLUDED.public_profile_enabled,
    priority_matching = EXCLUDED.priority_matching,
    verified_badge = EXCLUDED.verified_badge,
    premium_badge = EXCLUDED.premium_badge,
    valid_until = EXCLUDED.valid_until,
    updated_at = now()
  RETURNING id INTO v_ent_id;

  -- Matching status upsert
  INSERT INTO contractor_matching_status (
    contractor_id, is_eligible, eligibility_reason,
    capacity_status, accepting_new_projects, last_evaluated_at
  ) VALUES (
    p_contractor_id, p_can_be_matched,
    CASE WHEN p_can_be_matched THEN 'Activation manuelle admin' ELSE 'Matching désactivé par admin' END,
    'available', p_receives_appointments, now()
  )
  ON CONFLICT (contractor_id) DO UPDATE SET
    is_eligible = EXCLUDED.is_eligible,
    eligibility_reason = EXCLUDED.eligibility_reason,
    accepting_new_projects = EXCLUDED.accepting_new_projects,
    last_evaluated_at = now(),
    updated_at = now()
  RETURNING id INTO v_match_id;

  -- Snapshot AFTER
  SELECT jsonb_build_object(
    'subscription', (SELECT to_jsonb(s) FROM contractor_subscriptions s WHERE s.contractor_id = p_contractor_id),
    'entitlements', (SELECT to_jsonb(e) FROM contractor_entitlements e WHERE e.contractor_id = p_contractor_id),
    'matching_status', (SELECT to_jsonb(m) FROM contractor_matching_status m WHERE m.contractor_id = p_contractor_id)
  ) INTO v_after;

  -- Audit log
  INSERT INTO admin_activation_logs (
    contractor_id, admin_user_id, action, status, before_state, after_state
  ) VALUES (
    p_contractor_id, p_admin_user_id, 'admin_activate_contractor', 'success', v_before, v_after
  ) RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'ok', true,
    'subscription_id', v_sub_id,
    'entitlements_id', v_ent_id,
    'matching_status_id', v_match_id,
    'log_id', v_log_id
  );

EXCEPTION WHEN OTHERS THEN
  INSERT INTO admin_activation_logs (
    contractor_id, admin_user_id, action, status, before_state, error_message
  ) VALUES (
    p_contractor_id, p_admin_user_id, 'admin_activate_contractor', 'failure', v_before, SQLERRM
  );
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_activate_contractor_finalize FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_activate_contractor_finalize TO service_role;
