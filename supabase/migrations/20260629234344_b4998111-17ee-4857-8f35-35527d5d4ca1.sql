
-- ============================================================
-- UNPRO Demand Intelligence Engine V1 — Foundation
-- ============================================================

-- 1) demand_signals --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demand_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid NOT NULL,
  project_id uuid NOT NULL,
  city text NOT NULL,
  postal_code text,
  category text NOT NULL,
  subcategory text,
  estimated_project_value numeric NOT NULL DEFAULT 0,
  estimated_ltv numeric NOT NULL DEFAULT 0,
  urgency_score integer NOT NULL DEFAULT 5 CHECK (urgency_score BETWEEN 1 AND 10),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','matched','converted','expired')),
  position_in_queue integer,
  matched_contractor_id uuid,
  notify_channels jsonb NOT NULL DEFAULT '{"sms":true,"email":true,"push":true}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_demand_signals_city_cat_status ON public.demand_signals(city, category, status);
CREATE INDEX IF NOT EXISTS idx_demand_signals_homeowner ON public.demand_signals(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_demand_signals_matched ON public.demand_signals(matched_contractor_id) WHERE matched_contractor_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.demand_signals TO authenticated;
GRANT ALL ON public.demand_signals TO service_role;

ALTER TABLE public.demand_signals ENABLE ROW LEVEL SECURITY;

-- Homeowner: read & insert own
CREATE POLICY "Homeowner reads own demand signals"
  ON public.demand_signals FOR SELECT TO authenticated
  USING (homeowner_id = auth.uid());

CREATE POLICY "Homeowner inserts own demand signals"
  ON public.demand_signals FOR INSERT TO authenticated
  WITH CHECK (homeowner_id = auth.uid());

-- Contractor: ONLY signals matched to them
CREATE POLICY "Matched contractor reads its signal"
  ON public.demand_signals FOR SELECT TO authenticated
  USING (
    matched_contractor_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.contractor_members cm
      WHERE cm.contractor_id = demand_signals.matched_contractor_id
        AND cm.user_id = auth.uid()
    )
  );

-- Admin full
CREATE POLICY "Admins manage demand signals"
  ON public.demand_signals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 2) market_demand ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_demand (
  city text NOT NULL,
  category text NOT NULL,
  homeowner_count integer NOT NULL DEFAULT 0,
  total_projects integer NOT NULL DEFAULT 0,
  estimated_revenue numeric NOT NULL DEFAULT 0,
  estimated_ltv numeric NOT NULL DEFAULT 0,
  avg_urgency numeric NOT NULL DEFAULT 0,
  supply_count integer NOT NULL DEFAULT 0,
  gap_score numeric NOT NULL DEFAULT 0,
  pressure_score numeric NOT NULL DEFAULT 0,
  last_signal_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (city, category)
);

-- Aggregates only — safe for public read
GRANT SELECT ON public.market_demand TO anon, authenticated;
GRANT ALL ON public.market_demand TO service_role;

ALTER TABLE public.market_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads market demand aggregates"
  ON public.market_demand FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage market demand"
  ON public.market_demand FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 3) contractor_recruitment_targets ----------------------------------
CREATE TABLE IF NOT EXISTS public.contractor_recruitment_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  category text NOT NULL,
  waiting_count integer NOT NULL DEFAULT 0,
  estimated_revenue numeric NOT NULL DEFAULT 0,
  estimated_ltv numeric NOT NULL DEFAULT 0,
  pressure_score numeric NOT NULL DEFAULT 0,
  priority_score numeric NOT NULL DEFAULT 0,
  landing_slug text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','recruiting','covered','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city, category),
  UNIQUE(landing_slug)
);

CREATE INDEX IF NOT EXISTS idx_recruitment_targets_status_priority
  ON public.contractor_recruitment_targets(status, priority_score DESC);

-- Public read drives /pro/demande/:city/:category
GRANT SELECT ON public.contractor_recruitment_targets TO anon, authenticated;
GRANT ALL ON public.contractor_recruitment_targets TO service_role;

ALTER TABLE public.contractor_recruitment_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads recruitment targets"
  ON public.contractor_recruitment_targets FOR SELECT TO anon, authenticated
  USING (status IN ('active','recruiting','covered'));

CREATE POLICY "Admins manage recruitment targets"
  ON public.contractor_recruitment_targets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 4) contractor_referrals --------------------------------------------
CREATE TABLE IF NOT EXISTS public.contractor_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid NOT NULL,
  project_id uuid,
  contractor_name text NOT NULL,
  contractor_phone text,
  contractor_email text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','invited','registered','activated')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_referrals_homeowner ON public.contractor_referrals(homeowner_id);

GRANT SELECT, INSERT ON public.contractor_referrals TO authenticated;
GRANT ALL ON public.contractor_referrals TO service_role;

ALTER TABLE public.contractor_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homeowner inserts own referrals"
  ON public.contractor_referrals FOR INSERT TO authenticated
  WITH CHECK (homeowner_id = auth.uid());

CREATE POLICY "Homeowner reads own referrals"
  ON public.contractor_referrals FOR SELECT TO authenticated
  USING (homeowner_id = auth.uid());

CREATE POLICY "Admins manage referrals"
  ON public.contractor_referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- 5) updated_at triggers ---------------------------------------------
CREATE OR REPLACE FUNCTION public.di_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_demand_signals_updated_at
  BEFORE UPDATE ON public.demand_signals
  FOR EACH ROW EXECUTE FUNCTION public.di_touch_updated_at();

CREATE TRIGGER trg_recruitment_targets_updated_at
  BEFORE UPDATE ON public.contractor_recruitment_targets
  FOR EACH ROW EXECUTE FUNCTION public.di_touch_updated_at();

CREATE TRIGGER trg_contractor_referrals_updated_at
  BEFORE UPDATE ON public.contractor_referrals
  FOR EACH ROW EXECUTE FUNCTION public.di_touch_updated_at();


-- 6) Aggregation function & trigger ----------------------------------
CREATE OR REPLACE FUNCTION public.fn_refresh_market_demand(_city text, _category text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_homeowner_count int;
  v_total_projects int;
  v_est_revenue numeric;
  v_est_ltv numeric;
  v_avg_urgency numeric;
  v_avg_days numeric;
  v_last timestamptz;
  v_supply int;
  v_pressure numeric;
  v_gap numeric;
  v_slug text;
BEGIN
  SELECT
    COUNT(DISTINCT homeowner_id) FILTER (WHERE status = 'waiting'),
    COUNT(*) FILTER (WHERE status = 'waiting'),
    COALESCE(SUM(estimated_project_value) FILTER (WHERE status = 'waiting'), 0),
    COALESCE(SUM(estimated_ltv) FILTER (WHERE status = 'waiting'), 0),
    COALESCE(AVG(urgency_score) FILTER (WHERE status = 'waiting'), 0),
    COALESCE(AVG(EXTRACT(EPOCH FROM (now() - created_at))/86400.0) FILTER (WHERE status = 'waiting'), 0),
    MAX(created_at)
  INTO v_homeowner_count, v_total_projects, v_est_revenue, v_est_ltv, v_avg_urgency, v_avg_days, v_last
  FROM public.demand_signals
  WHERE city = _city AND category = _category;

  -- Supply count: contractors with service area in this city and matching category
  v_supply := 0;
  BEGIN
    SELECT COUNT(DISTINCT c.id) INTO v_supply
    FROM public.contractors c
    WHERE EXISTS (
      SELECT 1 FROM public.contractor_service_areas csa
      WHERE csa.contractor_id = c.id AND csa.city ILIKE _city
    )
    AND EXISTS (
      SELECT 1 FROM public.contractor_services cs
      WHERE cs.contractor_id = c.id AND cs.category ILIKE _category
    );
  EXCEPTION WHEN OTHERS THEN v_supply := 0;
  END;

  v_gap := GREATEST(0, v_homeowner_count - v_supply);
  v_pressure := v_homeowner_count
                * GREATEST(v_avg_urgency, 1)
                * GREATEST(v_est_revenue / NULLIF(v_total_projects,0), 1)
                * GREATEST(v_avg_days, 1);

  INSERT INTO public.market_demand (
    city, category, homeowner_count, total_projects, estimated_revenue,
    estimated_ltv, avg_urgency, supply_count, gap_score, pressure_score, last_signal_at, updated_at
  ) VALUES (
    _city, _category, v_homeowner_count, v_total_projects, v_est_revenue,
    v_est_ltv, v_avg_urgency, v_supply, v_gap, COALESCE(v_pressure,0), v_last, now()
  )
  ON CONFLICT (city, category) DO UPDATE SET
    homeowner_count = EXCLUDED.homeowner_count,
    total_projects = EXCLUDED.total_projects,
    estimated_revenue = EXCLUDED.estimated_revenue,
    estimated_ltv = EXCLUDED.estimated_ltv,
    avg_urgency = EXCLUDED.avg_urgency,
    supply_count = EXCLUDED.supply_count,
    gap_score = EXCLUDED.gap_score,
    pressure_score = EXCLUDED.pressure_score,
    last_signal_at = EXCLUDED.last_signal_at,
    updated_at = now();

  -- Recruitment target upsert
  v_slug := lower(regexp_replace(_category || '-' || _city, '[^a-z0-9]+', '-', 'g'));

  INSERT INTO public.contractor_recruitment_targets (
    city, category, waiting_count, estimated_revenue, estimated_ltv,
    pressure_score, priority_score, landing_slug, status
  ) VALUES (
    _city, _category, v_homeowner_count, v_est_revenue, v_est_ltv,
    COALESCE(v_pressure,0), COALESCE(v_pressure,0), v_slug,
    CASE
      WHEN v_homeowner_count = 0 THEN 'archived'
      WHEN v_supply = 0 THEN 'active'
      WHEN v_gap > 0 THEN 'recruiting'
      ELSE 'covered'
    END
  )
  ON CONFLICT (city, category) DO UPDATE SET
    waiting_count = EXCLUDED.waiting_count,
    estimated_revenue = EXCLUDED.estimated_revenue,
    estimated_ltv = EXCLUDED.estimated_ltv,
    pressure_score = EXCLUDED.pressure_score,
    priority_score = EXCLUDED.priority_score,
    status = EXCLUDED.status,
    updated_at = now();

  -- Reassign queue positions for waiting signals in this segment
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS pos
    FROM public.demand_signals
    WHERE city = _city AND category = _category AND status = 'waiting'
  )
  UPDATE public.demand_signals d
  SET position_in_queue = r.pos
  FROM ranked r WHERE d.id = r.id AND COALESCE(d.position_in_queue,-1) <> r.pos;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_demand_signal_refresh()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.fn_refresh_market_demand(OLD.city, OLD.category);
    RETURN OLD;
  END IF;
  PERFORM public.fn_refresh_market_demand(NEW.city, NEW.category);
  IF (TG_OP = 'UPDATE' AND (OLD.city <> NEW.city OR OLD.category <> NEW.category)) THEN
    PERFORM public.fn_refresh_market_demand(OLD.city, OLD.category);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_demand_signals_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.demand_signals
  FOR EACH ROW EXECUTE FUNCTION public.tg_demand_signal_refresh();


-- 7) fn_match_waiting_demand ----------------------------------------
CREATE OR REPLACE FUNCTION public.fn_match_waiting_demand(_contractor_id uuid)
RETURNS TABLE(matched_count int, segments jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  v_segments jsonb := '[]'::jsonb;
  r record;
BEGIN
  -- Match all waiting signals where contractor serves (city, category)
  FOR r IN
    SELECT DISTINCT d.city, d.category
    FROM public.demand_signals d
    WHERE d.status = 'waiting'
      AND EXISTS (
        SELECT 1 FROM public.contractor_service_areas csa
        WHERE csa.contractor_id = _contractor_id AND csa.city ILIKE d.city
      )
      AND EXISTS (
        SELECT 1 FROM public.contractor_services cs
        WHERE cs.contractor_id = _contractor_id AND cs.category ILIKE d.category
      )
  LOOP
    WITH upd AS (
      UPDATE public.demand_signals
      SET status = 'matched',
          matched_contractor_id = _contractor_id,
          updated_at = now()
      WHERE status = 'waiting'
        AND city = r.city
        AND category = r.category
      RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM upd;

    v_segments := v_segments || jsonb_build_object('city', r.city, 'category', r.category, 'count', v_count);
  END LOOP;

  SELECT COUNT(*) INTO v_count
  FROM public.demand_signals
  WHERE matched_contractor_id = _contractor_id AND status = 'matched';

  RETURN QUERY SELECT v_count, v_segments;
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_match_waiting_demand(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_refresh_market_demand(text, text) TO service_role;
