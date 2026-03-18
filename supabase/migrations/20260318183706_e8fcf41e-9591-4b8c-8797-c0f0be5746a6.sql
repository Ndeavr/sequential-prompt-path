
-- =========================================================
-- WAITLIST SYSTEM — Enhanced tables + scoring + replacement
-- =========================================================

-- 1. Extend territory_waitlist with scoring and status
ALTER TABLE public.territory_waitlist
  ADD COLUMN IF NOT EXISTS waitlist_score numeric(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS cluster text,
  ADD COLUMN IF NOT EXISTS profile_completeness numeric(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS niche_demand_score numeric(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_signals_score numeric(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS specialty_scarcity_score numeric(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS replaced_contractor_id uuid REFERENCES public.contractors(id),
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_territory_waitlist_score ON public.territory_waitlist(territory_id, waitlist_score DESC);
CREATE INDEX IF NOT EXISTS idx_territory_waitlist_status ON public.territory_waitlist(status);

-- 2. Contractor live performance scores
CREATE TABLE IF NOT EXISTS public.contractor_live_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  response_rate numeric(8,4) DEFAULT 0,
  booking_rate numeric(8,4) DEFAULT 0,
  acceptance_rate numeric(8,4) DEFAULT 0,
  client_rating numeric(8,4) DEFAULT 0,
  activity_frequency numeric(8,4) DEFAULT 0,
  profile_quality_score numeric(8,4) DEFAULT 0,
  composite_score numeric(8,4) DEFAULT 0,
  status text NOT NULL DEFAULT 'actif',
  risk_level text DEFAULT 'none',
  last_warning_at timestamptz,
  visibility_reduced boolean DEFAULT false,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contractor_id)
);

CREATE INDEX IF NOT EXISTS idx_cls_composite ON public.contractor_live_scores(composite_score);
CREATE INDEX IF NOT EXISTS idx_cls_status ON public.contractor_live_scores(status);

-- 3. Replacement log
CREATE TABLE IF NOT EXISTS public.waitlist_replacements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL REFERENCES public.territories(id),
  removed_contractor_id uuid NOT NULL REFERENCES public.contractors(id),
  removed_reason text NOT NULL DEFAULT 'low_performance',
  removed_score numeric(8,4),
  activated_contractor_id uuid REFERENCES public.contractors(id),
  activated_from_waitlist_id uuid REFERENCES public.territory_waitlist(id),
  activated_score numeric(8,4),
  executed_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. RLS
ALTER TABLE public.contractor_live_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_replacements ENABLE ROW LEVEL SECURITY;

-- contractor_live_scores: contractor sees own, admin sees all
CREATE POLICY "cls_select_own" ON public.contractor_live_scores
  FOR SELECT TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "cls_admin_all" ON public.contractor_live_scores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- waitlist_replacements: admin only + involved contractors read
CREATE POLICY "wr_select" ON public.waitlist_replacements
  FOR SELECT TO authenticated
  USING (
    removed_contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR activated_contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "wr_admin_write" ON public.waitlist_replacements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. RPC: Calculate contractor live score
CREATE OR REPLACE FUNCTION public.calculate_contractor_live_score(p_contractor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_response numeric := 0;
  v_booking numeric := 0;
  v_acceptance numeric := 0;
  v_rating numeric := 0;
  v_activity numeric := 0;
  v_profile numeric := 0;
  v_composite numeric := 0;
  v_status text := 'actif';
  v_risk text := 'none';
  v_threshold_low numeric := 35;
  v_threshold_critical numeric := 20;
  v_perf record;
  v_contractor record;
  v_completion jsonb;
BEGIN
  SELECT * INTO v_contractor FROM public.contractors WHERE id = p_contractor_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  -- Get performance metrics if exist
  SELECT * INTO v_perf FROM public.contractor_performance_metrics WHERE contractor_id = p_contractor_id LIMIT 1;

  IF FOUND THEN
    v_response := COALESCE((1.0 - LEAST(COALESCE(v_perf.response_time_avg_hours, 24), 48) / 48.0) * 100, 50);
    v_booking := COALESCE(v_perf.close_rate, 0.3) * 100;
    v_acceptance := COALESCE(v_perf.appointment_show_rate, 0.8) * 100;
    v_rating := COALESCE(v_perf.review_sentiment_score, 0.7) * 100;
    v_activity := CASE WHEN v_perf.last_calculated_at > now() - interval '7 days' THEN 80 WHEN v_perf.last_calculated_at > now() - interval '30 days' THEN 50 ELSE 20 END;
  ELSE
    v_response := 50;
    v_booking := 30;
    v_acceptance := 80;
    v_rating := 70;
    v_activity := 40;
  END IF;

  -- Profile quality
  v_completion := public.get_profile_completion(p_contractor_id);
  v_profile := COALESCE((v_completion->>'percentage')::numeric, 50);

  -- Weighted composite
  v_composite := ROUND(
    v_response * 0.20 +
    v_booking * 0.20 +
    v_acceptance * 0.20 +
    v_rating * 0.15 +
    v_activity * 0.15 +
    v_profile * 0.10
  , 2);

  -- Determine status and risk
  IF v_composite < v_threshold_critical THEN
    v_status := 'remplace';
    v_risk := 'critical';
  ELSIF v_composite < v_threshold_low THEN
    v_status := 'a_risque';
    v_risk := 'high';
  ELSIF v_composite < 50 THEN
    v_status := 'surveillance';
    v_risk := 'medium';
  ELSE
    v_status := 'actif';
    v_risk := 'none';
  END IF;

  -- Upsert
  INSERT INTO public.contractor_live_scores (
    contractor_id, response_rate, booking_rate, acceptance_rate,
    client_rating, activity_frequency, profile_quality_score,
    composite_score, status, risk_level, calculated_at, updated_at
  ) VALUES (
    p_contractor_id, v_response, v_booking, v_acceptance,
    v_rating, v_activity, v_profile,
    v_composite, v_status, v_risk, now(), now()
  )
  ON CONFLICT (contractor_id) DO UPDATE SET
    response_rate = EXCLUDED.response_rate,
    booking_rate = EXCLUDED.booking_rate,
    acceptance_rate = EXCLUDED.acceptance_rate,
    client_rating = EXCLUDED.client_rating,
    activity_frequency = EXCLUDED.activity_frequency,
    profile_quality_score = EXCLUDED.profile_quality_score,
    composite_score = EXCLUDED.composite_score,
    status = EXCLUDED.status,
    risk_level = EXCLUDED.risk_level,
    calculated_at = EXCLUDED.calculated_at,
    updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'contractor_id', p_contractor_id,
    'response_rate', v_response,
    'booking_rate', v_booking,
    'acceptance_rate', v_acceptance,
    'client_rating', v_rating,
    'activity_frequency', v_activity,
    'profile_quality_score', v_profile,
    'composite_score', v_composite,
    'status', v_status,
    'risk_level', v_risk
  );
END;
$$;

-- 6. RPC: Calculate waitlist score
CREATE OR REPLACE FUNCTION public.calculate_waitlist_score(p_waitlist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wl record;
  v_contractor record;
  v_completion jsonb;
  v_profile_score numeric := 0;
  v_demand_score numeric := 0;
  v_recency_score numeric := 0;
  v_trust_score numeric := 0;
  v_scarcity_score numeric := 0;
  v_total numeric := 0;
  v_territory record;
  v_assigned_count integer;
BEGIN
  SELECT * INTO v_wl FROM public.territory_waitlist WHERE id = p_waitlist_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT * INTO v_contractor FROM public.contractors WHERE id = v_wl.contractor_id;
  SELECT * INTO v_territory FROM public.territories WHERE id = v_wl.territory_id;

  -- Profile completeness (30%)
  v_completion := public.get_profile_completion(v_wl.contractor_id);
  v_profile_score := COALESCE((v_completion->>'percentage')::numeric, 50);

  -- Niche demand (20%) — how many assignments vs max
  SELECT count(*) INTO v_assigned_count FROM public.territory_assignments WHERE territory_id = v_wl.territory_id AND active = true;
  v_demand_score := CASE WHEN v_territory.max_entrepreneurs > 0
    THEN LEAST(100, (v_assigned_count::numeric / v_territory.max_entrepreneurs) * 100)
    ELSE 50 END;

  -- Signup recency (20%) — newer = higher
  v_recency_score := GREATEST(0, 100 - EXTRACT(EPOCH FROM (now() - v_wl.created_at)) / 86400 * 2);

  -- Trust signals (15%) — aipp score
  v_trust_score := COALESCE(v_contractor.aipp_score, 30)::numeric;

  -- Specialty scarcity (15%) — if few contractors with same specialty
  v_scarcity_score := 60; -- default, could be enhanced later

  v_total := ROUND(
    v_profile_score * 0.30 +
    v_demand_score * 0.20 +
    v_recency_score * 0.20 +
    v_trust_score * 0.15 +
    v_scarcity_score * 0.15
  , 2);

  UPDATE public.territory_waitlist SET
    waitlist_score = v_total,
    profile_completeness = v_profile_score,
    niche_demand_score = v_demand_score,
    trust_signals_score = v_trust_score,
    specialty_scarcity_score = v_scarcity_score,
    updated_at = now()
  WHERE id = p_waitlist_id;

  RETURN jsonb_build_object(
    'waitlist_id', p_waitlist_id,
    'profile_completeness', v_profile_score,
    'niche_demand_score', v_demand_score,
    'recency_score', v_recency_score,
    'trust_signals_score', v_trust_score,
    'specialty_scarcity_score', v_scarcity_score,
    'waitlist_score', v_total
  );
END;
$$;

-- 7. RPC: Process auto-replacement for a territory
CREATE OR REPLACE FUNCTION public.process_waitlist_replacement(p_territory_id uuid, p_threshold numeric DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_low_performer record;
  v_best_candidate record;
  v_result jsonb := '{"replacements": []}'::jsonb;
  v_replacements jsonb := '[]'::jsonb;
BEGIN
  -- Find contractors in this territory below threshold
  FOR v_low_performer IN
    SELECT ta.id as assignment_id, ta.contractor_id, cls.composite_score
    FROM public.territory_assignments ta
    JOIN public.contractor_live_scores cls ON cls.contractor_id = ta.contractor_id
    WHERE ta.territory_id = p_territory_id
      AND ta.active = true
      AND cls.composite_score < p_threshold
    ORDER BY cls.composite_score ASC
  LOOP
    -- Find best waitlist candidate
    SELECT * INTO v_best_candidate
    FROM public.territory_waitlist
    WHERE territory_id = p_territory_id
      AND status = 'pending'
    ORDER BY waitlist_score DESC
    LIMIT 1;

    IF FOUND THEN
      -- Deactivate low performer
      UPDATE public.territory_assignments SET active = false WHERE id = v_low_performer.assignment_id;

      -- Update contractor live score status
      UPDATE public.contractor_live_scores SET status = 'remplace', visibility_reduced = true, updated_at = now()
      WHERE contractor_id = v_low_performer.contractor_id;

      -- Activate candidate
      INSERT INTO public.territory_assignments (contractor_id, territory_id, plan_level, slot_type, active)
      VALUES (v_best_candidate.contractor_id, p_territory_id, 'recrue', 'recrue', true);

      -- Update waitlist entry
      UPDATE public.territory_waitlist SET
        status = 'activated',
        activated_at = now(),
        replaced_contractor_id = v_low_performer.contractor_id,
        updated_at = now()
      WHERE id = v_best_candidate.id;

      -- Log
      INSERT INTO public.waitlist_replacements (territory_id, removed_contractor_id, removed_reason, removed_score, activated_contractor_id, activated_from_waitlist_id, activated_score)
      VALUES (p_territory_id, v_low_performer.contractor_id, 'low_performance', v_low_performer.composite_score, v_best_candidate.contractor_id, v_best_candidate.id, v_best_candidate.waitlist_score);

      v_replacements := v_replacements || jsonb_build_array(jsonb_build_object(
        'removed_contractor_id', v_low_performer.contractor_id,
        'removed_score', v_low_performer.composite_score,
        'activated_contractor_id', v_best_candidate.contractor_id,
        'activated_score', v_best_candidate.waitlist_score
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('territory_id', p_territory_id, 'replacements', v_replacements);
END;
$$;
