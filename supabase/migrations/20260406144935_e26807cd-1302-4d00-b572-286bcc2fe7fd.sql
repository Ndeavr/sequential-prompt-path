
-- ===== TABLE: plan_project_size_included_appointments =====
CREATE TABLE IF NOT EXISTS public.plan_project_size_included_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text NOT NULL,
  project_size_code text NOT NULL,
  access_allowed boolean NOT NULL DEFAULT false,
  units_consumed_per_appointment numeric NOT NULL DEFAULT 1.0,
  upgrade_target_plan_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_code, project_size_code)
);

ALTER TABLE public.plan_project_size_included_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read plan project size access"
  ON public.plan_project_size_included_appointments FOR SELECT USING (true);

CREATE POLICY "Admins manage plan project size access"
  ON public.plan_project_size_included_appointments FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== TABLE: cluster_domain_project_size_appointment_value =====
CREATE TABLE IF NOT EXISTS public.cluster_domain_project_size_appointment_value (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_key text NOT NULL,
  domain_key text NOT NULL,
  project_size_code text NOT NULL,
  annual_market_value numeric NOT NULL DEFAULT 0,
  value_per_slot numeric NOT NULL DEFAULT 0,
  appointment_capture_factor numeric NOT NULL DEFAULT 0.020,
  appointment_market_value numeric NOT NULL DEFAULT 0,
  scarcity_status text NOT NULL DEFAULT 'open',
  cluster_value_tier text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_key, domain_key, project_size_code)
);

ALTER TABLE public.cluster_domain_project_size_appointment_value ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read appointment values"
  ON public.cluster_domain_project_size_appointment_value FOR SELECT USING (true);

CREATE POLICY "Admins manage appointment values"
  ON public.cluster_domain_project_size_appointment_value FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== FUNCTION: compute_included_appointments =====
CREATE OR REPLACE FUNCTION public.compute_included_appointments(_plan_code text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  pia record;
  sizes jsonb;
BEGIN
  SELECT * INTO pia FROM public.plan_included_appointments WHERE plan_code = _plan_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'plan_not_found'); END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'project_size_code', pps.project_size_code,
    'access_allowed', pps.access_allowed,
    'units_consumed', pps.units_consumed_per_appointment,
    'upgrade_target', pps.upgrade_target_plan_code
  )), '[]'::jsonb) INTO sizes
  FROM public.plan_project_size_included_appointments pps
  WHERE pps.plan_code = _plan_code;

  RETURN jsonb_build_object(
    'plan_code', _plan_code,
    'included_appointments_monthly', pia.included_appointments_monthly,
    'included_units_monthly', pia.included_units_monthly,
    'base_extra_price', pia.base_extra_appointment_price,
    'can_rollover', pia.can_rollover_unused_appointments,
    'rollover_cap', pia.rollover_cap_units,
    'project_size_access', sizes
  );
END;
$$;

-- ===== FUNCTION: compute_extra_appointment_value =====
CREATE OR REPLACE FUNCTION public.compute_extra_appointment_value(
  _plan_code text,
  _project_size_code text,
  _cluster_value_tier text DEFAULT 'medium',
  _scarcity_status text DEFAULT 'open'
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_base numeric;
  v_size_mult numeric;
  v_scarcity_mult numeric;
  v_cluster_mult numeric;
  v_floor_factor numeric := 0.12;
  v_market_value numeric := 0;
  v_final numeric;
  v_ps record;
  v_pia record;
BEGIN
  SELECT * INTO v_pia FROM public.plan_included_appointments WHERE plan_code = _plan_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'plan_not_found'); END IF;
  v_base := v_pia.base_extra_appointment_price;

  SELECT * INTO v_ps FROM public.project_sizes WHERE code = _project_size_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'size_not_found'); END IF;
  v_size_mult := v_ps.size_multiplier;

  v_scarcity_mult := CASE _scarcity_status
    WHEN 'open' THEN 1.00
    WHEN 'tight' THEN 1.10
    WHEN 'rare' THEN 1.25
    WHEN 'full' THEN 1.50
    WHEN 'locked' THEN 1.75
    ELSE 1.00
  END;

  v_cluster_mult := CASE _cluster_value_tier
    WHEN 'low' THEN 0.90
    WHEN 'medium' THEN 1.00
    WHEN 'high' THEN 1.15
    WHEN 'elite' THEN 1.30
    ELSE 1.00
  END;

  -- Check for market value
  SELECT appointment_market_value INTO v_market_value
  FROM public.cluster_domain_project_size_appointment_value
  WHERE project_size_code = _project_size_code
    AND cluster_value_tier = _cluster_value_tier
    AND scarcity_status = _scarcity_status
  LIMIT 1;
  v_market_value := COALESCE(v_market_value, 0);

  v_final := GREATEST(
    v_base * v_size_mult * v_scarcity_mult * v_cluster_mult,
    v_market_value * v_floor_factor
  );

  RETURN jsonb_build_object(
    'plan_code', _plan_code,
    'project_size_code', _project_size_code,
    'base_extra_price', v_base,
    'size_multiplier', v_size_mult,
    'scarcity_multiplier', v_scarcity_mult,
    'cluster_value_multiplier', v_cluster_mult,
    'market_value', v_market_value,
    'monetization_floor', v_market_value * v_floor_factor,
    'final_extra_price', ROUND(v_final, 2)
  );
END;
$$;

-- ===== FUNCTION: track_appointment_consumption =====
CREATE OR REPLACE FUNCTION public.track_appointment_consumption(
  _contractor_id uuid,
  _plan_code text,
  _project_size_code text,
  _new_status text,
  _billing_cycle_start timestamptz DEFAULT date_trunc('month', now())
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ps record;
  v_usage record;
  v_units numeric;
  v_is_billable boolean;
  v_is_extra boolean := false;
  v_extra_price numeric := 0;
  v_billing_cycle_end timestamptz;
BEGIN
  v_billing_cycle_end := _billing_cycle_start + interval '1 month';

  SELECT * INTO v_ps FROM public.project_sizes WHERE code = _project_size_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'size_not_found'); END IF;
  v_units := v_ps.units_consumed_per_appointment;

  v_is_billable := _new_status IN ('confirmed', 'completed');

  -- Get or create usage record
  SELECT * INTO v_usage FROM public.entrepreneur_plan_usage
  WHERE contractor_id = _contractor_id
    AND billing_cycle_start = _billing_cycle_start;

  IF NOT FOUND THEN
    INSERT INTO public.entrepreneur_plan_usage (
      contractor_id, plan_code, billing_cycle_start, billing_cycle_end,
      included_appointments_monthly, included_units_monthly, remaining_units
    )
    SELECT _contractor_id, _plan_code, _billing_cycle_start, v_billing_cycle_end,
      pia.included_appointments_monthly, pia.included_units_monthly, pia.included_units_monthly
    FROM public.plan_included_appointments pia WHERE pia.plan_code = _plan_code
    RETURNING * INTO v_usage;
  END IF;

  IF NOT v_is_billable THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'non_billable_status', 'new_status', _new_status);
  END IF;

  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM public.plan_project_size_included_appointments
    WHERE plan_code = _plan_code AND project_size_code = _project_size_code AND access_allowed = true
  ) THEN
    RETURN jsonb_build_object('error', 'size_not_allowed', 'plan_code', _plan_code, 'project_size_code', _project_size_code);
  END IF;

  -- Check if extra
  v_is_extra := (v_usage.remaining_units - v_units) < 0;

  IF v_is_extra THEN
    SELECT (result->>'final_extra_price')::numeric INTO v_extra_price
    FROM public.compute_extra_appointment_value(_plan_code, _project_size_code) AS result;
  END IF;

  -- Update usage
  UPDATE public.entrepreneur_plan_usage SET
    consumed_appointments_count = consumed_appointments_count + 1,
    consumed_units = consumed_units + v_units,
    remaining_units = GREATEST(0, remaining_units - v_units),
    overage_appointments_count = overage_appointments_count + (CASE WHEN v_is_extra THEN 1 ELSE 0 END),
    overage_units = overage_units + (CASE WHEN v_is_extra THEN v_units ELSE 0 END),
    overage_amount = overage_amount + v_extra_price,
    updated_at = now()
  WHERE id = v_usage.id;

  -- Log billing event
  INSERT INTO public.appointment_billing_events (
    contractor_id, event_type, new_status, units_delta, amount_delta, reason, billable
  ) VALUES (
    _contractor_id, CASE WHEN v_is_extra THEN 'extra_appointment' ELSE 'included_appointment' END,
    _new_status, v_units, v_extra_price, _project_size_code || ' appointment consumed', v_is_billable
  );

  -- If extra, record it
  IF v_is_extra THEN
    INSERT INTO public.entrepreneur_extra_appointments (
      contractor_id, plan_code, project_size_code, units_consumed,
      extra_price, billing_status, billing_cycle_start
    ) VALUES (
      _contractor_id, _plan_code, _project_size_code, v_units,
      v_extra_price, 'pending', _billing_cycle_start
    );
  END IF;

  -- Check upgrade recommendation
  PERFORM public.check_upgrade_recommendation(v_usage.id);

  RETURN jsonb_build_object(
    'consumed', true,
    'is_extra', v_is_extra,
    'units_consumed', v_units,
    'extra_price', v_extra_price,
    'remaining_units', GREATEST(0, v_usage.remaining_units - v_units)
  );
END;
$$;

-- ===== FUNCTION: check_upgrade_recommendation =====
CREATE OR REPLACE FUNCTION public.check_upgrade_recommendation(_usage_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_usage record;
  v_current_plan record;
  v_next_plan record;
  v_break_even numeric;
BEGIN
  SELECT * INTO v_usage FROM public.entrepreneur_plan_usage WHERE id = _usage_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_current_plan FROM public.plan_definitions WHERE code = v_usage.plan_code;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_next_plan FROM public.plan_definitions
  WHERE rank = v_current_plan.rank + 1 AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;

  v_break_even := (v_next_plan.base_price_monthly - v_current_plan.base_price_monthly) / 100.0;

  IF v_usage.overage_amount >= v_break_even * 0.85 THEN
    UPDATE public.entrepreneur_plan_usage SET
      upgrade_recommended = true,
      upgrade_target_plan = v_next_plan.code,
      upgrade_savings_projected = v_usage.overage_amount - v_break_even,
      updated_at = now()
    WHERE id = _usage_id;
  END IF;
END;
$$;

-- ===== FUNCTION: compute_monthly_overage =====
CREATE OR REPLACE FUNCTION public.compute_monthly_overage(
  _contractor_id uuid,
  _billing_cycle_start timestamptz DEFAULT date_trunc('month', now())
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_usage record;
  v_extras jsonb;
BEGIN
  SELECT * INTO v_usage FROM public.entrepreneur_plan_usage
  WHERE contractor_id = _contractor_id AND billing_cycle_start = _billing_cycle_start;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'no_usage_record'); END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'project_size_code', project_size_code,
    'units_consumed', units_consumed,
    'extra_price', extra_price,
    'billing_status', billing_status
  )), '[]'::jsonb) INTO v_extras
  FROM public.entrepreneur_extra_appointments
  WHERE contractor_id = _contractor_id AND billing_cycle_start = _billing_cycle_start;

  RETURN jsonb_build_object(
    'contractor_id', _contractor_id,
    'plan_code', v_usage.plan_code,
    'included_units', v_usage.included_units_monthly,
    'consumed_units', v_usage.consumed_units,
    'remaining_units', v_usage.remaining_units,
    'overage_count', v_usage.overage_appointments_count,
    'overage_units', v_usage.overage_units,
    'overage_amount', v_usage.overage_amount,
    'upgrade_recommended', v_usage.upgrade_recommended,
    'upgrade_target', v_usage.upgrade_target_plan,
    'upgrade_savings', v_usage.upgrade_savings_projected,
    'extra_appointments', v_extras
  );
END;
$$;

-- ===== FUNCTION: manual_override_appointment_quota =====
CREATE OR REPLACE FUNCTION public.manual_override_appointment_quota(
  _contractor_id uuid,
  _plan_code text,
  _included_units numeric,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_usage_id uuid;
  v_cycle_start timestamptz := date_trunc('month', now());
BEGIN
  UPDATE public.entrepreneur_plan_usage SET
    included_units_monthly = _included_units,
    remaining_units = GREATEST(0, _included_units - consumed_units),
    updated_at = now()
  WHERE contractor_id = _contractor_id AND billing_cycle_start = v_cycle_start
  RETURNING id INTO v_usage_id;

  IF v_usage_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_active_cycle');
  END IF;

  INSERT INTO public.appointment_billing_events (
    contractor_id, event_type, units_delta, amount_delta, reason, billable
  ) VALUES (
    _contractor_id, 'manual_override', _included_units, 0, _reason, false
  );

  INSERT INTO public.appointment_value_history (
    context_key, new_value, reason
  ) VALUES (
    'manual_override:' || _contractor_id::text,
    jsonb_build_object('included_units', _included_units, 'plan_code', _plan_code),
    _reason
  );

  RETURN jsonb_build_object('ok', true, 'usage_id', v_usage_id, 'new_included_units', _included_units);
END;
$$;

-- ===== FUNCTION: refresh_appointment_value_matrix =====
CREATE OR REPLACE FUNCTION public.refresh_appointment_value_matrix()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
  r record;
BEGIN
  FOR r IN SELECT * FROM public.extra_appointment_pricing_rules WHERE is_active = true
  LOOP
    UPDATE public.extra_appointment_pricing_rules SET
      computed_final_price = ROUND(
        r.base_extra_price * r.size_multiplier * r.scarcity_multiplier * r.cluster_value_multiplier, 2
      ),
      updated_at = now()
    WHERE id = r.id;
    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object('refreshed', v_updated);
END;
$$;
