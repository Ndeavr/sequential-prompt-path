-- 1. PARENT RELATIONSHIP -------------------------------------------------
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS parent_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_attribution_id uuid;

DO $$ BEGIN
  ALTER TABLE public.affiliates
    ADD CONSTRAINT affiliates_no_self_parent CHECK (parent_affiliate_id IS NULL OR parent_affiliate_id <> id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_affiliates_parent ON public.affiliates(parent_affiliate_id);

-- Guard: no cycles, parent immutable once set (unless admin flag set)
CREATE OR REPLACE FUNCTION public.affiliates_guard_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grandparent uuid;
BEGIN
  IF NEW.parent_affiliate_id IS NOT NULL THEN
    IF NEW.parent_affiliate_id = NEW.id THEN
      RAISE EXCEPTION 'affiliate cannot be its own parent';
    END IF;
    SELECT parent_affiliate_id INTO v_grandparent FROM public.affiliates WHERE id = NEW.parent_affiliate_id;
    IF v_grandparent = NEW.id THEN
      RAISE EXCEPTION 'circular affiliate parent relationship rejected';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.parent_affiliate_id IS NOT NULL
     AND NEW.parent_affiliate_id IS DISTINCT FROM OLD.parent_affiliate_id
     AND COALESCE(current_setting('unpro.allow_parent_reassign', true), '') <> 'on' THEN
    RAISE EXCEPTION 'parent_affiliate_id is immutable once assigned';
  END IF;

  IF NEW.parent_affiliate_id IS DISTINCT FROM COALESCE(OLD.parent_affiliate_id, NULL)
     AND NEW.parent_affiliate_id IS NOT NULL THEN
    NEW.parent_assigned_at := COALESCE(NEW.parent_assigned_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliates_guard_parent ON public.affiliates;
CREATE TRIGGER trg_affiliates_guard_parent
  BEFORE INSERT OR UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.affiliates_guard_parent();

-- 2. COMMISSION RECORDS ---------------------------------------------------
ALTER TABLE public.affiliate_conversions
  ADD COLUMN IF NOT EXISTS commission_kind text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS parent_of_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_conversion_id uuid REFERENCES public.affiliate_conversions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_event_key text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.affiliate_conversions
    ADD CONSTRAINT affiliate_conversions_kind_chk CHECK (commission_kind IN ('direct','subaffiliate_override'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_subaffiliate_override_per_source
  ON public.affiliate_conversions(source_conversion_id)
  WHERE commission_kind = 'subaffiliate_override';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_affiliate_conversion_event_key
  ON public.affiliate_conversions(source_event_key)
  WHERE source_event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_kind ON public.affiliate_conversions(affiliate_id, commission_kind);

-- 3. SERVER-SIDE OVERRIDE RATE -------------------------------------------
ALTER TABLE public.affiliate_settings
  ADD COLUMN IF NOT EXISTS subaffiliate_override_pct numeric NOT NULL DEFAULT 5;

-- 4. OVERRIDE ENGINE ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.affiliate_apply_subaffiliate_override()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent uuid;
  v_pct numeric;
  v_amount integer;
BEGIN
  IF NEW.commission_kind <> 'direct' THEN
    RETURN NEW;
  END IF;

  SELECT a.parent_affiliate_id INTO v_parent
  FROM public.affiliates a
  WHERE a.id = NEW.affiliate_id;

  IF v_parent IS NULL THEN
    RETURN NEW;
  END IF;

  -- parent must still be an active affiliate
  IF NOT EXISTS (SELECT 1 FROM public.affiliates p WHERE p.id = v_parent AND p.status = 'active') THEN
    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (v_parent, 'subaffiliate_override_skipped', 'skipped', 'parent inactive',
            jsonb_build_object('source_conversion_id', NEW.id, 'selling_affiliate_id', NEW.affiliate_id));
    RETURN NEW;
  END IF;

  SELECT COALESCE(subaffiliate_override_pct, 5) INTO v_pct FROM public.affiliate_settings LIMIT 1;
  v_pct := COALESCE(v_pct, 5);
  v_amount := round(COALESCE(NEW.value_cents, 0) * v_pct / 100.0);

  IF v_amount <= 0 THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.affiliate_conversions (
      affiliate_id, user_id, attribution_id, conversion_type, value_cents,
      commission_rate, commission_amount_cents, status,
      commission_kind, parent_of_affiliate_id, source_conversion_id, metadata
    ) VALUES (
      v_parent, NEW.user_id, NEW.attribution_id, NEW.conversion_type, NEW.value_cents,
      v_pct, v_amount, COALESCE(NEW.status, 'pending'),
      'subaffiliate_override', NEW.affiliate_id, NEW.id,
      jsonb_build_object('source', 'subaffiliate_override_v1')
    );

    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (v_parent, 'subaffiliate_override_created', 'created', 'Commission équipe 5%',
            jsonb_build_object('source_conversion_id', NEW.id, 'selling_affiliate_id', NEW.affiliate_id,
                               'amount_cents', v_amount, 'rate', v_pct));
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (v_parent, 'subaffiliate_override_duplicate_prevented', 'skipped', 'duplicate prevented',
            jsonb_build_object('source_conversion_id', NEW.id));
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliate_subaffiliate_override ON public.affiliate_conversions;
CREATE TRIGGER trg_affiliate_subaffiliate_override
  AFTER INSERT ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_apply_subaffiliate_override();

-- Propagate status changes (reversal / approval / payout) to the override row
CREATE OR REPLACE FUNCTION public.affiliate_sync_override_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.commission_kind = 'direct' AND NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.affiliate_conversions
       SET status = NEW.status, updated_at = now()
     WHERE source_conversion_id = NEW.id
       AND commission_kind = 'subaffiliate_override';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliate_sync_override_status ON public.affiliate_conversions;
CREATE TRIGGER trg_affiliate_sync_override_status
  BEFORE UPDATE ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_sync_override_status();

-- 5. PARENT ASSIGNMENT ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_affiliate_parent(
  p_affiliate_id uuid,
  p_ref_code text,
  p_attribution_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child public.affiliates%ROWTYPE;
  v_parent public.affiliates%ROWTYPE;
BEGIN
  SELECT * INTO v_child FROM public.affiliates WHERE id = p_affiliate_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'affiliate_not_found');
  END IF;

  IF v_child.parent_affiliate_id IS NOT NULL THEN
    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (p_affiliate_id, 'parent_attribution_rejected', 'rejected', 'parent already assigned',
            jsonb_build_object('ref_code', p_ref_code));
    RETURN jsonb_build_object('assigned', false, 'reason', 'parent_already_assigned');
  END IF;

  SELECT * INTO v_parent FROM public.affiliates
   WHERE referral_code = p_ref_code AND status = 'active';
  IF NOT FOUND THEN
    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (p_affiliate_id, 'parent_attribution_rejected', 'rejected', 'invalid or inactive ref code',
            jsonb_build_object('ref_code', p_ref_code));
    RETURN jsonb_build_object('assigned', false, 'reason', 'invalid_ref_code');
  END IF;

  IF v_parent.id = v_child.id THEN
    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (p_affiliate_id, 'parent_attribution_rejected', 'rejected', 'self referral',
            jsonb_build_object('ref_code', p_ref_code));
    RETURN jsonb_build_object('assigned', false, 'reason', 'self_referral');
  END IF;

  IF v_parent.parent_affiliate_id = v_child.id THEN
    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (p_affiliate_id, 'parent_attribution_rejected', 'rejected', 'circular relationship',
            jsonb_build_object('ref_code', p_ref_code));
    RETURN jsonb_build_object('assigned', false, 'reason', 'circular');
  END IF;

  UPDATE public.affiliates
     SET parent_affiliate_id = v_parent.id,
         parent_assigned_at = now(),
         parent_attribution_id = p_attribution_id,
         updated_at = now()
   WHERE id = p_affiliate_id;

  INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
  VALUES (v_parent.id, 'subaffiliate_recruited', 'assigned', 'Nouvel affilié recruté',
          jsonb_build_object('child_affiliate_id', p_affiliate_id, 'ref_code', p_ref_code,
                             'attribution_id', p_attribution_id));

  RETURN jsonb_build_object('assigned', true, 'parent_affiliate_id', v_parent.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reassign_affiliate_parent(
  p_affiliate_id uuid,
  p_parent_affiliate_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF p_parent_affiliate_id IS NOT NULL AND p_parent_affiliate_id = p_affiliate_id THEN
    RAISE EXCEPTION 'self referral not allowed';
  END IF;

  SELECT parent_affiliate_id INTO v_old FROM public.affiliates WHERE id = p_affiliate_id;

  PERFORM set_config('unpro.allow_parent_reassign', 'on', true);
  UPDATE public.affiliates
     SET parent_affiliate_id = p_parent_affiliate_id,
         parent_assigned_at = CASE WHEN p_parent_affiliate_id IS NULL THEN NULL ELSE now() END,
         updated_at = now()
   WHERE id = p_affiliate_id;
  PERFORM set_config('unpro.allow_parent_reassign', 'off', true);

  INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
  VALUES (p_affiliate_id, 'parent_reassigned_by_admin', 'updated', p_reason,
          jsonb_build_object('old_parent', v_old, 'new_parent', p_parent_affiliate_id, 'admin_id', auth.uid()));

  RETURN jsonb_build_object('ok', true, 'old_parent', v_old, 'new_parent', p_parent_affiliate_id);
END;
$$;

-- 6. TEAM VIEW ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_affiliate_team
WITH (security_invoker = true) AS
SELECT
  child.parent_affiliate_id                      AS parent_affiliate_id,
  child.id                                       AS affiliate_id,
  COALESCE(child.name, trim(coalesce(child.first_name,'')||' '||coalesce(child.last_name,''))) AS affiliate_name,
  child.status                                   AS status,
  child.created_at                               AS joined_at,
  child.parent_assigned_at                       AS recruited_at,
  COALESCE(sales.eligible_revenue_cents, 0)      AS eligible_revenue_cents,
  COALESCE(ovr.override_commission_cents, 0)     AS override_commission_cents,
  sales.last_sale_at                             AS last_sale_at
FROM public.affiliates child
LEFT JOIN LATERAL (
  SELECT sum(c.value_cents)::bigint AS eligible_revenue_cents, max(c.created_at) AS last_sale_at
  FROM public.affiliate_conversions c
  WHERE c.affiliate_id = child.id
    AND c.commission_kind = 'direct'
    AND c.status <> 'reversed'
) sales ON true
LEFT JOIN LATERAL (
  SELECT sum(o.commission_amount_cents)::bigint AS override_commission_cents
  FROM public.affiliate_conversions o
  WHERE o.parent_of_affiliate_id = child.id
    AND o.commission_kind = 'subaffiliate_override'
    AND o.status <> 'reversed'
) ovr ON true
WHERE child.parent_affiliate_id IS NOT NULL;

GRANT SELECT ON public.v_affiliate_team TO authenticated;
GRANT ALL ON public.v_affiliate_team TO service_role;

-- 7. RLS ------------------------------------------------------------------
-- Affiliates can read team rows where they are the parent
DROP POLICY IF EXISTS "Affiliates view team conversions" ON public.affiliate_conversions;
CREATE POLICY "Affiliates view team conversions" ON public.affiliate_conversions
FOR SELECT TO authenticated
USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Affiliates cannot write commissions at all (server functions use SECURITY DEFINER)
DROP POLICY IF EXISTS "Affiliates insert conversions" ON public.affiliate_conversions;

-- Prevent affiliates from changing their own parent / rates
CREATE OR REPLACE FUNCTION public.affiliates_protect_financial_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_affiliate_id IS DISTINCT FROM OLD.parent_affiliate_id
     OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
     OR NEW.commission_pct IS DISTINCT FROM OLD.commission_pct
     OR NEW.commission_flat_cents IS DISTINCT FROM OLD.commission_flat_cents THEN
    RAISE EXCEPTION 'financial fields are read-only for affiliates';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliates_protect_financial ON public.affiliates;
CREATE TRIGGER trg_affiliates_protect_financial
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.affiliates_protect_financial_columns();