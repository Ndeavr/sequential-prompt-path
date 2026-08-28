-- ============================================================
-- UNPRO — Granular monetization matrix (fail-closed)
-- ============================================================

ALTER TABLE public.profession_compliance_rules
  ADD COLUMN IF NOT EXISTS matching_status text NOT NULL DEFAULT 'PENDING_LEGAL_REVIEW',
  ADD COLUMN IF NOT EXISTS platform_subscription_status text NOT NULL DEFAULT 'PENDING_LEGAL_REVIEW',
  ADD COLUMN IF NOT EXISTS fixed_referral_fee_status text NOT NULL DEFAULT 'PENDING_LEGAL_REVIEW',
  ADD COLUMN IF NOT EXISTS fixed_appointment_fee_status text NOT NULL DEFAULT 'PENDING_LEGAL_REVIEW',
  ADD COLUMN IF NOT EXISTS success_fee_status text NOT NULL DEFAULT 'PENDING_LEGAL_REVIEW',
  ADD COLUMN IF NOT EXISTS percentage_commission_status text NOT NULL DEFAULT 'PENDING_LEGAL_REVIEW',
  ADD COLUMN IF NOT EXISTS affiliate_commission_status text NOT NULL DEFAULT 'PENDING_LEGAL_REVIEW',
  ADD COLUMN IF NOT EXISTS monetization_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS monetization_notes jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['matching_status','platform_subscription_status','fixed_referral_fee_status',
                           'fixed_appointment_fee_status','success_fee_status',
                           'percentage_commission_status','affiliate_commission_status']
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.profession_compliance_rules ADD CONSTRAINT pcr_%s_chk CHECK (%I IN (''ALLOWED'',''ALLOWED_WITH_CONDITIONS'',''PENDING_LEGAL_REVIEW'',''PROHIBITED'',''PROHIBITED_FOR_UNPRO''))',
        c, c);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

-- Backward compatibility: project granular columns into the legacy jsonb map.
CREATE OR REPLACE FUNCTION public.profession_compliance_sync_legacy()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  legacy_of text;
BEGIN
  NEW.compensation_rules := jsonb_build_object(
    'membership_monthly',   NEW.platform_subscription_status,
    'membership_annual',    NEW.platform_subscription_status,
    'listing_subscription', NEW.platform_subscription_status,
    'appointment_fee_fixed',NEW.fixed_appointment_fee_status,
    'referral_fee_fixed',   NEW.fixed_referral_fee_status,
    'success_fee',          NEW.success_fee_status,
    'percentage_commission',NEW.percentage_commission_status,
    'affiliate_commission', NEW.affiliate_commission_status
  );
  NEW.matching_allowed := NEW.matching_status IN ('ALLOWED','ALLOWED_WITH_CONDITIONS');
  NEW.paid_referral_status := CASE
    WHEN NEW.fixed_referral_fee_status = 'ALLOWED' THEN 'ALLOWED'
    WHEN NEW.fixed_referral_fee_status = 'ALLOWED_WITH_CONDITIONS' THEN 'RESTRICTED'
    WHEN NEW.fixed_referral_fee_status IN ('PROHIBITED','PROHIBITED_FOR_UNPRO') THEN 'PROHIBITED'
    ELSE 'RESTRICTED_PENDING_LEGAL_REVIEW' END;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_profession_compliance_sync_legacy ON public.profession_compliance_rules;
CREATE TRIGGER trg_profession_compliance_sync_legacy
  BEFORE INSERT OR UPDATE ON public.profession_compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.profession_compliance_sync_legacy();

-- ============================================================
-- Granular, condition-aware, fail-closed evaluation
-- ============================================================
DROP FUNCTION IF EXISTS public.evaluate_profession_compliance(text,text,text,text);

CREATE OR REPLACE FUNCTION public.evaluate_profession_compliance(
  _profession_code text,
  _action text,
  _compensation_type text DEFAULT NULL,
  _alex_scope text DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.profession_compliance_rules%ROWTYPE;
  decision text := 'PENDING_LEGAL_REVIEW';
  reason text;
  slot text;
  conds jsonb := '[]'::jsonb;
  unmet text[] := ARRAY[]::text[];
  cond text;
BEGIN
  IF _profession_code IS NULL OR btrim(_profession_code) = '' THEN
    RETURN jsonb_build_object('decision','PENDING_REVIEW','allowed',false,'fail_closed',true,
      'reason','missing_profession_code','profession_code',_profession_code,'action',_action);
  END IF;

  SELECT * INTO r FROM public.profession_compliance_rules
   WHERE profession_code = _profession_code AND is_active
     AND effective_from <= now()
     AND (effective_until IS NULL OR effective_until > now())
   ORDER BY effective_from DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('decision','PENDING_REVIEW','allowed',false,'fail_closed',true,
      'reason','no_active_rule','profession_code',_profession_code,'action',_action);
  END IF;

  IF _action = 'matching' THEN
    slot := 'matching'; decision := r.matching_status;
  ELSIF _action = 'appointment' THEN
    decision := CASE WHEN r.appointment_allowed THEN 'ALLOWED' ELSE 'PENDING_LEGAL_REVIEW' END;
  ELSIF _action = 'advertising' THEN
    decision := CASE WHEN r.advertising_allowed THEN 'ALLOWED' ELSE 'PENDING_LEGAL_REVIEW' END;
  ELSIF _action = 'paid_referral' THEN
    slot := 'fixed_referral_fee'; decision := r.fixed_referral_fee_status;
  ELSIF _action = 'alex_action' THEN
    IF _alex_scope IS NULL THEN
      decision := 'PENDING_REVIEW'; reason := 'missing_alex_scope';
    ELSIF r.alex_prohibited_scope ? _alex_scope THEN
      decision := 'PROHIBITED'; reason := 'alex_scope_prohibited';
    ELSIF r.alex_allowed_scope ? _alex_scope THEN
      decision := 'ALLOWED';
    ELSE
      decision := 'PENDING_REVIEW'; reason := 'alex_scope_not_declared';
    END IF;
  ELSIF _action = 'compensation' THEN
    IF _compensation_type IS NULL THEN
      decision := 'PENDING_REVIEW'; reason := 'missing_compensation_type';
    ELSE
      slot := CASE _compensation_type
        WHEN 'membership_monthly'    THEN 'platform_subscription'
        WHEN 'membership_annual'     THEN 'platform_subscription'
        WHEN 'listing_subscription'  THEN 'platform_subscription'
        WHEN 'appointment_fee_fixed' THEN 'fixed_appointment_fee'
        WHEN 'referral_fee_fixed'    THEN 'fixed_referral_fee'
        WHEN 'success_fee'           THEN 'success_fee'
        WHEN 'percentage_commission' THEN 'percentage_commission'
        WHEN 'affiliate_commission'  THEN 'affiliate_commission'
        ELSE NULL END;
      IF slot IS NULL THEN
        decision := 'PENDING_REVIEW'; reason := 'compensation_type_not_declared';
      ELSE
        decision := CASE slot
          WHEN 'platform_subscription'  THEN r.platform_subscription_status
          WHEN 'fixed_appointment_fee'  THEN r.fixed_appointment_fee_status
          WHEN 'fixed_referral_fee'     THEN r.fixed_referral_fee_status
          WHEN 'success_fee'            THEN r.success_fee_status
          WHEN 'percentage_commission'  THEN r.percentage_commission_status
          WHEN 'affiliate_commission'   THEN r.affiliate_commission_status END;
      END IF;
    END IF;
  ELSE
    decision := 'PENDING_REVIEW'; reason := 'unknown_action';
  END IF;

  -- ALLOWED_WITH_CONDITIONS must prove every condition; otherwise fail closed.
  IF decision = 'ALLOWED_WITH_CONDITIONS' AND slot IS NOT NULL THEN
    conds := COALESCE(r.monetization_conditions -> slot, '[]'::jsonb);
    FOR cond IN SELECT jsonb_array_elements_text(conds) LOOP
      IF COALESCE((_context ->> cond)::boolean, false) IS NOT TRUE THEN
        unmet := unmet || cond;
      END IF;
    END LOOP;
    IF array_length(unmet, 1) IS NULL THEN
      reason := 'conditions_satisfied';
    ELSE
      decision := 'PENDING_LEGAL_REVIEW';
      reason := 'conditions_not_met';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'decision', decision,
    'allowed', decision = 'ALLOWED' OR (decision = 'ALLOWED_WITH_CONDITIONS' AND array_length(unmet,1) IS NULL),
    'fail_closed', NOT (decision = 'ALLOWED' OR (decision = 'ALLOWED_WITH_CONDITIONS' AND array_length(unmet,1) IS NULL)),
    'reason', reason,
    'action', _action,
    'slot', slot,
    'required_conditions', conds,
    'unmet_conditions', to_jsonb(unmet),
    'condition_note', CASE WHEN slot IS NULL THEN NULL ELSE r.monetization_notes ->> slot END,
    'compensation_type', _compensation_type,
    'alex_scope', _alex_scope,
    'profession_code', r.profession_code,
    'profession_label_fr', r.profession_label_fr,
    'profession_type', r.profession_type,
    'regulator_code', r.regulator_code,
    'regulator_name', r.regulator_name,
    'requires_regulated_handoff', r.requires_regulated_handoff,
    'required_disclosures', r.required_disclosures,
    'prohibited_claims', r.prohibited_claims,
    'legal_review_status', r.legal_review_status,
    'rule_id', r.id,
    'source_url', r.source_url,
    'source_last_verified_at', r.source_last_verified_at
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.evaluate_profession_compliance(text,text,text,text,jsonb) TO anon, authenticated, service_role;

-- ============================================================
-- Backfill granular columns from legacy values (safe defaults)
-- ============================================================
UPDATE public.profession_compliance_rules SET
  matching_status = CASE WHEN matching_allowed THEN 'ALLOWED' ELSE 'PENDING_LEGAL_REVIEW' END,
  platform_subscription_status = CASE WHEN compensation_rules ->> 'membership_monthly' = 'ALLOWED' THEN 'ALLOWED' ELSE 'PENDING_LEGAL_REVIEW' END,
  fixed_referral_fee_status    = CASE WHEN compensation_rules ->> 'referral_fee_fixed' = 'ALLOWED' THEN 'ALLOWED' ELSE 'PENDING_LEGAL_REVIEW' END,
  fixed_appointment_fee_status = CASE WHEN compensation_rules ->> 'appointment_fee_fixed' = 'ALLOWED' THEN 'ALLOWED' ELSE 'PENDING_LEGAL_REVIEW' END,
  success_fee_status           = CASE WHEN compensation_rules ->> 'success_fee' = 'ALLOWED' THEN 'ALLOWED' ELSE 'PENDING_LEGAL_REVIEW' END,
  percentage_commission_status = CASE WHEN compensation_rules ->> 'percentage_commission' = 'ALLOWED' THEN 'ALLOWED' ELSE 'PENDING_LEGAL_REVIEW' END,
  affiliate_commission_status  = CASE WHEN compensation_rules ->> 'affiliate_commission' = 'ALLOWED' THEN 'ALLOWED' ELSE 'PENDING_LEGAL_REVIEW' END;

-- ============================================================
-- Priority rules
-- ============================================================
-- AMF: insurance damage broker + mortgage broker
UPDATE public.profession_compliance_rules SET
  matching_status = 'ALLOWED',
  requires_regulated_handoff = true,
  platform_subscription_status = 'ALLOWED',
  fixed_referral_fee_status = 'ALLOWED_WITH_CONDITIONS',
  fixed_appointment_fee_status = 'ALLOWED_WITH_CONDITIONS',
  success_fee_status = 'PROHIBITED_FOR_UNPRO',
  percentage_commission_status = 'PROHIBITED_FOR_UNPRO',
  affiliate_commission_status = 'PROHIBITED_FOR_UNPRO',
  monetization_conditions = jsonb_build_object(
    'fixed_referral_fee', '["fee_is_fixed","not_success_contingent","unpro_role_referrer_only","no_professional_advice_by_unpro","disclosure_presented"]'::jsonb,
    'fixed_appointment_fee', '["fee_is_fixed","not_success_contingent","unpro_role_referrer_only","no_professional_advice_by_unpro","disclosure_presented"]'::jsonb
  ),
  monetization_notes = jsonb_build_object(
    'fixed_referral_fee','Autorisé uniquement si la rémunération est réellement fixe, non conditionnelle à la vente, et si UNPRO demeure une plateforme de mise en relation.',
    'fixed_appointment_fee','Autorisé uniquement si le frais est fixe et non conditionnel à la conclusion du dossier.',
    'success_fee','Interdit pour UNPRO : rémunération conditionnelle à la vente du produit réglementé.',
    'percentage_commission','Interdit par défaut : partage de prime ou de commission professionnelle.',
    'affiliate_commission','La compensation d''affiliation doit passer la même règle; aucun héritage du pourcentage entrepreneur.'
  )
WHERE profession_code IN ('insurance_broker_damage','mortgage_broker');

-- OACIQ: real estate broker
UPDATE public.profession_compliance_rules SET
  matching_status = 'ALLOWED',
  platform_subscription_status = 'ALLOWED',
  fixed_referral_fee_status = 'PENDING_LEGAL_REVIEW',
  fixed_appointment_fee_status = 'PENDING_LEGAL_REVIEW',
  success_fee_status = 'PROHIBITED_FOR_UNPRO',
  percentage_commission_status = 'PROHIBITED_FOR_UNPRO',
  affiliate_commission_status = 'PROHIBITED_FOR_UNPRO',
  prohibited_claims = '["#1","meilleur","best","numéro 1","courtier no 1","recommandé par l''OACIQ","approuvé par l''OACIQ"]'::jsonb,
  monetization_notes = jsonb_build_object(
    'platform_subscription','Abonnement plateforme : modèle de monétisation par défaut.',
    'success_fee','Interdit par défaut : rémunération liée à la transaction.',
    'percentage_commission','Interdit par défaut : partage de la rétribution de courtage.'
  )
WHERE profession_code = 'real_estate_broker';

-- Ordres professionnels: engineer, notary, architect, professional technologist
UPDATE public.profession_compliance_rules SET
  matching_status = 'ALLOWED',
  platform_subscription_status = 'ALLOWED',
  fixed_referral_fee_status = 'PENDING_LEGAL_REVIEW',
  fixed_appointment_fee_status = 'PENDING_LEGAL_REVIEW',
  success_fee_status = 'PROHIBITED_FOR_UNPRO',
  percentage_commission_status = 'PROHIBITED_FOR_UNPRO',
  affiliate_commission_status = 'PENDING_LEGAL_REVIEW',
  monetization_notes = jsonb_build_object(
    'platform_subscription','Frais de plateforme, de technologie et de visibilité indépendants des honoraires professionnels.',
    'success_fee','Interdit par défaut : indépendance professionnelle et restrictions de partage d''honoraires.',
    'percentage_commission','Interdit par défaut : partage d''honoraires professionnels.',
    'fixed_referral_fee','En attente de révision juridique documentée.'
  )
WHERE profession_code IN ('engineer','notary','architect','professional_technologist');

-- Contractors: preserve the existing production golden path exactly.
UPDATE public.profession_compliance_rules SET
  matching_status = 'ALLOWED',
  platform_subscription_status = 'ALLOWED',
  fixed_referral_fee_status = 'ALLOWED',
  fixed_appointment_fee_status = 'ALLOWED',
  success_fee_status = 'ALLOWED',
  affiliate_commission_status = 'ALLOWED'
WHERE profession_code IN ('contractor_general','contractor_specialized');

UPDATE public.profession_compliance_rules SET
  matching_status = 'ALLOWED',
  platform_subscription_status = 'ALLOWED',
  fixed_referral_fee_status = 'ALLOWED',
  fixed_appointment_fee_status = 'ALLOWED',
  affiliate_commission_status = 'ALLOWED'
WHERE profession_code IN ('electrician','plumber','building_inspector');
