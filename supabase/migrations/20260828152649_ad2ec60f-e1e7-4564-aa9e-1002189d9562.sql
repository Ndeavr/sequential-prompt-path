-- ============================================================
-- UNPRO — Professional Compliance Engine
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profession_compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profession_code text NOT NULL UNIQUE,
  profession_label_fr text NOT NULL,
  profession_label_en text,
  profession_type text NOT NULL DEFAULT 'regulated',            -- regulated | non_regulated | self_regulated
  regulator_code text,                                          -- RBQ | CMEQ | CMMTQ | AMF | OACIQ | CNQ | OIQ | OAQ | OTPQ | NONE
  regulator_name text,
  regulator_url text,

  credential_type text,                                         -- licence | permis | certificat | membership
  credential_required boolean NOT NULL DEFAULT true,
  credential_source text,                                       -- registre officiel consultable
  credential_expiry_required boolean NOT NULL DEFAULT false,
  automated_verification_available boolean NOT NULL DEFAULT false,

  reserved_acts jsonb NOT NULL DEFAULT '[]'::jsonb,
  alex_allowed_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  alex_prohibited_scope jsonb NOT NULL DEFAULT '[]'::jsonb,

  matching_allowed boolean NOT NULL DEFAULT false,
  appointment_allowed boolean NOT NULL DEFAULT false,
  advertising_allowed boolean NOT NULL DEFAULT false,
  paid_referral_status text NOT NULL DEFAULT 'PENDING_REVIEW',
  requires_regulated_handoff boolean NOT NULL DEFAULT false,

  -- compensation_rules: { "<compensation_type>": "ALLOWED|RESTRICTED|PENDING_REVIEW|PROHIBITED" }
  compensation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,

  required_disclosures jsonb NOT NULL DEFAULT '[]'::jsonb,
  prohibited_claims jsonb NOT NULL DEFAULT '[]'::jsonb,

  legal_review_status text NOT NULL DEFAULT 'PENDING_REVIEW',   -- PENDING_REVIEW | IN_REVIEW | REVIEWED | REJECTED
  legal_review_notes text,
  legal_reviewed_by uuid,
  legal_reviewed_at timestamptz,

  source_url text,
  source_reference text,
  source_last_verified_at timestamptz,

  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profession_compliance_rules_paid_referral_chk
    CHECK (paid_referral_status IN ('ALLOWED','RESTRICTED','PENDING_REVIEW','PROHIBITED','RESTRICTED_PENDING_LEGAL_REVIEW')),
  CONSTRAINT profession_compliance_rules_legal_chk
    CHECK (legal_review_status IN ('PENDING_REVIEW','IN_REVIEW','REVIEWED','REJECTED')),
  CONSTRAINT profession_compliance_rules_type_chk
    CHECK (profession_type IN ('regulated','non_regulated','self_regulated'))
);

GRANT SELECT ON public.profession_compliance_rules TO anon;
GRANT SELECT ON public.profession_compliance_rules TO authenticated;
GRANT ALL ON public.profession_compliance_rules TO service_role;

ALTER TABLE public.profession_compliance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance rules are publicly readable"
  ON public.profession_compliance_rules FOR SELECT USING (true);

CREATE POLICY "admins manage compliance rules"
  ON public.profession_compliance_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_profession_rules_active
  ON public.profession_compliance_rules (profession_code) WHERE is_active;

CREATE OR REPLACE FUNCTION public.profession_compliance_rules_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profession_compliance_rules_touch
  BEFORE UPDATE ON public.profession_compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.profession_compliance_rules_touch();

-- ── Audit of rule changes into the existing system_audit_logs ──
CREATE OR REPLACE FUNCTION public.profession_compliance_rules_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.system_audit_logs
    (actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, source)
  VALUES (
    'admin', auth.uid(), 'compliance_rule_changed', 'profession_compliance_rule',
    COALESCE(NEW.id, OLD.id)::text,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'profession_compliance_engine'
  );
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_profession_compliance_rules_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.profession_compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.profession_compliance_rules_audit();

-- ============================================================
-- Extend the existing credential store instead of duplicating it
-- ============================================================
ALTER TABLE public.contractor_credentials
  ADD COLUMN IF NOT EXISTS profession_code text,
  ADD COLUMN IF NOT EXISTS verification_state text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS credential_status text NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text;

DO $$ BEGIN
  ALTER TABLE public.contractor_credentials
    ADD CONSTRAINT contractor_credentials_verification_state_chk
    CHECK (verification_state IN ('VERIFIED','DECLARED','INFERRED','PENDING'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contractor_credentials
    ADD CONSTRAINT contractor_credentials_credential_status_chk
    CHECK (credential_status IN ('ACTIVE','EXPIRED','SUSPENDED','UNVERIFIED','PENDING_REVIEW'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_contractor_credentials_profession
  ON public.contractor_credentials (profession_code);

-- ============================================================
-- Server-side evaluation (fail closed)
-- ============================================================
CREATE OR REPLACE FUNCTION public.evaluate_profession_compliance(
  _profession_code text,
  _action text,                     -- matching | appointment | advertising | paid_referral | alex_action | compensation
  _compensation_type text DEFAULT NULL,
  _alex_scope text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.profession_compliance_rules%ROWTYPE;
  decision text := 'PENDING_REVIEW';
  reason text;
BEGIN
  IF _profession_code IS NULL OR btrim(_profession_code) = '' THEN
    RETURN jsonb_build_object(
      'decision','PENDING_REVIEW','allowed',false,'fail_closed',true,
      'reason','missing_profession_code','profession_code',_profession_code,'action',_action);
  END IF;

  SELECT * INTO r FROM public.profession_compliance_rules
   WHERE profession_code = _profession_code
     AND is_active
     AND effective_from <= now()
     AND (effective_until IS NULL OR effective_until > now())
   ORDER BY effective_from DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'decision','PENDING_REVIEW','allowed',false,'fail_closed',true,
      'reason','no_active_rule','profession_code',_profession_code,'action',_action);
  END IF;

  IF _action = 'matching' THEN
    decision := CASE WHEN r.matching_allowed THEN 'ALLOWED' ELSE 'PENDING_REVIEW' END;
  ELSIF _action = 'appointment' THEN
    decision := CASE WHEN r.appointment_allowed THEN 'ALLOWED' ELSE 'PENDING_REVIEW' END;
  ELSIF _action = 'advertising' THEN
    decision := CASE WHEN r.advertising_allowed THEN 'ALLOWED' ELSE 'PENDING_REVIEW' END;
  ELSIF _action = 'paid_referral' THEN
    decision := r.paid_referral_status;
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
      decision := COALESCE(r.compensation_rules ->> _compensation_type, 'PENDING_REVIEW');
      IF r.compensation_rules ->> _compensation_type IS NULL THEN
        reason := 'compensation_type_not_declared';
      END IF;
    END IF;
  ELSE
    decision := 'PENDING_REVIEW'; reason := 'unknown_action';
  END IF;

  RETURN jsonb_build_object(
    'decision', decision,
    'allowed', decision = 'ALLOWED',
    'fail_closed', decision <> 'ALLOWED',
    'reason', reason,
    'action', _action,
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

GRANT EXECUTE ON FUNCTION public.evaluate_profession_compliance(text,text,text,text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.log_compliance_event(
  _action text,
  _entity_type text,
  _entity_id text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.system_audit_logs
    (actor_type, actor_id, action, entity_type, entity_id, metadata, source)
  VALUES (
    COALESCE(_metadata ->> 'actor_type', 'system'),
    auth.uid(), _action, _entity_type, _entity_id, _metadata, 'profession_compliance_engine')
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.log_compliance_event(text,text,text,jsonb) TO authenticated, service_role;

-- ============================================================
-- Affiliate compensation gate (fail closed, never auto-applies)
-- ============================================================
ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS profession_code text,
  ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'ALLOWED',
  ADD COLUMN IF NOT EXISTS compliance_reason text,
  ADD COLUMN IF NOT EXISTS compliance_rule_id uuid;

CREATE OR REPLACE FUNCTION public.affiliate_commissions_compliance_gate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prof text;
  verdict jsonb;
BEGIN
  prof := COALESCE(NEW.profession_code, NEW.metadata ->> 'profession_code');

  -- No profession declared => existing contractor golden path, unchanged.
  IF prof IS NULL OR btrim(prof) = '' THEN
    NEW.compliance_status := 'ALLOWED';
    NEW.compliance_reason := 'non_regulated_default_contractor_path';
    RETURN NEW;
  END IF;

  verdict := public.evaluate_profession_compliance(prof, 'compensation', 'affiliate_commission', NULL);
  NEW.profession_code := prof;
  NEW.compliance_status := verdict ->> 'decision';
  NEW.compliance_reason := verdict ->> 'reason';
  NEW.compliance_rule_id := NULLIF(verdict ->> 'rule_id','')::uuid;

  IF (verdict ->> 'decision') <> 'ALLOWED' THEN
    NEW.status := 'pending_compliance_review';
    INSERT INTO public.system_audit_logs
      (actor_type, actor_id, action, entity_type, entity_id, metadata, source)
    VALUES ('system', auth.uid(), 'commission_blocked', 'affiliate_commission',
            COALESCE(NEW.id, gen_random_uuid())::text,
            jsonb_build_object('profession_code', prof, 'verdict', verdict,
                               'affiliate_id', NEW.affiliate_id,
                               'label_fr', 'Commission en attente de validation réglementaire'),
            'profession_compliance_engine');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_affiliate_commissions_compliance_gate ON public.affiliate_commissions;
CREATE TRIGGER trg_affiliate_commissions_compliance_gate
  BEFORE INSERT OR UPDATE OF profession_code, monthly_commission_cents, status
  ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_commissions_compliance_gate();

-- ============================================================
-- Seed: initial Quebec professions (sourced, dated, reviewable)
-- ============================================================
INSERT INTO public.profession_compliance_rules (
  profession_code, profession_label_fr, profession_label_en, profession_type,
  regulator_code, regulator_name, regulator_url,
  credential_type, credential_required, credential_source, credential_expiry_required,
  automated_verification_available,
  reserved_acts, alex_allowed_scope, alex_prohibited_scope,
  matching_allowed, appointment_allowed, advertising_allowed,
  paid_referral_status, requires_regulated_handoff,
  compensation_rules, required_disclosures, prohibited_claims,
  legal_review_status, source_url, source_reference, source_last_verified_at
) VALUES
-- 1. Entrepreneur général RBQ
('contractor_general','Entrepreneur général (RBQ)','General contractor (RBQ)','regulated',
 'RBQ','Régie du bâtiment du Québec','https://www.rbq.gouv.qc.ca',
 'licence', true, 'Registre des détenteurs de licence RBQ', true, true,
 '["travaux de construction assujettis à la Loi sur le bâtiment"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent","cost_range_estimate"]',
 '["reserved_professional_act","legal_advice"]',
 true, true, true, 'ALLOWED', false,
 '{"membership_monthly":"ALLOWED","membership_annual":"ALLOWED","listing_subscription":"ALLOWED","appointment_fee_fixed":"ALLOWED","referral_fee_fixed":"ALLOWED","success_fee":"ALLOWED","percentage_commission":"PENDING_REVIEW","affiliate_commission":"ALLOWED"}',
 '["UNPRO facilite la sélection et la mise en relation avec des professionnels."]',
 '["#1","meilleur","best","numéro 1","garanti le moins cher","recommandé par la RBQ"]',
 'REVIEWED','https://www.rbq.gouv.qc.ca/licence/','Loi sur le bâtiment (RLRQ c B-1.1)', now()),

-- 2. Entrepreneur spécialisé RBQ
('contractor_specialized','Entrepreneur spécialisé (RBQ)','Specialized contractor (RBQ)','regulated',
 'RBQ','Régie du bâtiment du Québec','https://www.rbq.gouv.qc.ca',
 'licence', true, 'Registre des détenteurs de licence RBQ', true, true,
 '["travaux de la sous-catégorie visée"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent","cost_range_estimate"]',
 '["reserved_professional_act","legal_advice"]',
 true, true, true, 'ALLOWED', false,
 '{"membership_monthly":"ALLOWED","membership_annual":"ALLOWED","listing_subscription":"ALLOWED","appointment_fee_fixed":"ALLOWED","referral_fee_fixed":"ALLOWED","success_fee":"ALLOWED","percentage_commission":"PENDING_REVIEW","affiliate_commission":"ALLOWED"}',
 '["UNPRO facilite la sélection et la mise en relation avec des professionnels."]',
 '["#1","meilleur","best","numéro 1","recommandé par la RBQ"]',
 'REVIEWED','https://www.rbq.gouv.qc.ca/licence/','Loi sur le bâtiment (RLRQ c B-1.1)', now()),

-- 3. Électricien / CMEQ
('electrician','Électricien (CMEQ / RBQ)','Electrician (CMEQ / RBQ)','regulated',
 'CMEQ','Corporation des maîtres électriciens du Québec','https://www.cmeq.org',
 'licence', true, 'Répertoire des membres CMEQ + licence RBQ sous-catégorie 16', true, false,
 '["travaux d''électricité réservés aux maîtres électriciens"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent"]',
 '["reserved_professional_act","electrical_design_advice"]',
 true, true, true, 'ALLOWED', false,
 '{"membership_monthly":"ALLOWED","membership_annual":"ALLOWED","listing_subscription":"ALLOWED","appointment_fee_fixed":"ALLOWED","referral_fee_fixed":"ALLOWED","success_fee":"PENDING_REVIEW","percentage_commission":"PENDING_REVIEW","affiliate_commission":"ALLOWED"}',
 '["Les travaux électriques réservés sont exécutés par le maître électricien concerné."]',
 '["#1","meilleur","best","certifié par la CMEQ pour UNPRO"]',
 'PENDING_REVIEW','https://www.cmeq.org','Loi sur les maîtres électriciens (RLRQ c M-3)', now()),

-- 4. Plomberie / CMMTQ
('plumber','Plombier / Maître mécanicien en tuyauterie (CMMTQ)','Plumber (CMMTQ)','regulated',
 'CMMTQ','Corporation des maîtres mécaniciens en tuyauterie du Québec','https://www.cmmtq.org',
 'licence', true, 'Répertoire des membres CMMTQ + licence RBQ sous-catégorie 15', true, false,
 '["travaux de plomberie et de chauffage réservés"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent"]',
 '["reserved_professional_act","plumbing_design_advice"]',
 true, true, true, 'ALLOWED', false,
 '{"membership_monthly":"ALLOWED","membership_annual":"ALLOWED","listing_subscription":"ALLOWED","appointment_fee_fixed":"ALLOWED","referral_fee_fixed":"ALLOWED","success_fee":"PENDING_REVIEW","percentage_commission":"PENDING_REVIEW","affiliate_commission":"ALLOWED"}',
 '["Les travaux de plomberie réservés sont exécutés par le maître mécanicien concerné."]',
 '["#1","meilleur","best"]',
 'PENDING_REVIEW','https://www.cmmtq.org','Loi sur les maîtres mécaniciens en tuyauterie (RLRQ c M-4)', now()),

-- 5. Inspecteur en bâtiment (non encadré par un ordre)
('building_inspector','Inspecteur en bâtiment','Building inspector','non_regulated',
 'NONE','Aucun ordre professionnel unique au Québec', NULL,
 'certificat', false, 'Association professionnelle déclarée (AIBQ, InterNACHI, etc.)', false, false,
 '[]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent"]',
 '["reserved_professional_act","structural_engineering_opinion"]',
 true, true, true, 'PENDING_REVIEW', false,
 '{"membership_monthly":"ALLOWED","membership_annual":"ALLOWED","listing_subscription":"ALLOWED","appointment_fee_fixed":"ALLOWED","referral_fee_fixed":"PENDING_REVIEW","success_fee":"PENDING_REVIEW","percentage_commission":"PENDING_REVIEW","affiliate_commission":"PENDING_REVIEW"}',
 '["L''inspection en bâtiment n''est pas une profession à titre réservé au Québec. Vérifiez les certifications déclarées."]',
 '["#1","meilleur","best","inspecteur certifié par le gouvernement"]',
 'PENDING_REVIEW', NULL, 'Aucune loi de titre réservé applicable — à valider', now()),

-- 6. Courtier en assurance de dommages (AMF)
('insurance_broker_damage','Courtier en assurance de dommages (AMF)','Damage insurance broker (AMF)','regulated',
 'AMF','Autorité des marchés financiers','https://lautorite.qc.ca',
 'certificat', true, 'Registre des entreprises et des individus autorisés à exercer (AMF)', true, false,
 '["conseil en assurance","recommandation de produit d''assurance","placement de risque"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent","regulated_handoff"]',
 '["insurance_product_recommendation","insurer_recommendation","coverage_amount_advice","policy_comparison","premium_quote","reserved_professional_act"]',
 true, true, false, 'RESTRICTED_PENDING_LEGAL_REVIEW', true,
 '{"membership_monthly":"PENDING_REVIEW","membership_annual":"PENDING_REVIEW","listing_subscription":"PENDING_REVIEW","appointment_fee_fixed":"PENDING_REVIEW","referral_fee_fixed":"PENDING_REVIEW","success_fee":"RESTRICTED","percentage_commission":"RESTRICTED","affiliate_commission":"RESTRICTED"}',
 '["UNPRO facilite la sélection et la mise en relation avec des professionnels. Les conseils et services professionnels réglementés sont fournis par le professionnel concerné.","UNPRO n''offre aucun conseil en assurance."]',
 '["#1","meilleur","best","meilleure prime","économisez garanti","recommandé par l''AMF","approuvé par l''AMF"]',
 'PENDING_REVIEW','https://lautorite.qc.ca','Loi sur la distribution de produits et services financiers (RLRQ c D-9.2)', now()),

-- 7. Courtier hypothécaire (AMF)
('mortgage_broker','Courtier hypothécaire (AMF)','Mortgage broker (AMF)','regulated',
 'AMF','Autorité des marchés financiers','https://lautorite.qc.ca',
 'certificat', true, 'Registre des entreprises et des individus autorisés à exercer (AMF)', true, false,
 '["conseil en financement hypothécaire","placement de prêt hypothécaire"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent","regulated_handoff"]',
 '["mortgage_product_recommendation","rate_advice","lender_recommendation","borrowing_capacity_opinion","reserved_professional_act"]',
 true, true, false, 'RESTRICTED_PENDING_LEGAL_REVIEW', true,
 '{"membership_monthly":"PENDING_REVIEW","membership_annual":"PENDING_REVIEW","listing_subscription":"PENDING_REVIEW","appointment_fee_fixed":"PENDING_REVIEW","referral_fee_fixed":"PENDING_REVIEW","success_fee":"RESTRICTED","percentage_commission":"RESTRICTED","affiliate_commission":"RESTRICTED"}',
 '["UNPRO facilite la sélection et la mise en relation avec des professionnels. Les conseils et services professionnels réglementés sont fournis par le professionnel concerné."]',
 '["#1","meilleur taux","best","taux garanti","recommandé par l''AMF"]',
 'PENDING_REVIEW','https://lautorite.qc.ca','Loi sur la distribution de produits et services financiers (RLRQ c D-9.2)', now()),

-- 8. Courtier immobilier (OACIQ)
('real_estate_broker','Courtier immobilier (OACIQ)','Real estate broker (OACIQ)','regulated',
 'OACIQ','Organisme d''autoréglementation du courtage immobilier du Québec','https://www.oaciq.com',
 'permis', true, 'Registre des titulaires de permis OACIQ', true, false,
 '["opérations de courtage immobilier","conseil en transaction immobilière"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent","regulated_handoff"]',
 '["property_valuation","transaction_advice","commission_negotiation","reserved_professional_act"]',
 true, true, true, 'PENDING_REVIEW', true,
 '{"membership_monthly":"PENDING_REVIEW","membership_annual":"PENDING_REVIEW","listing_subscription":"PENDING_REVIEW","appointment_fee_fixed":"PENDING_REVIEW","referral_fee_fixed":"PENDING_REVIEW","success_fee":"PENDING_REVIEW","percentage_commission":"PENDING_REVIEW","affiliate_commission":"PENDING_REVIEW"}',
 '["UNPRO facilite la sélection et la mise en relation avec des professionnels. Les services de courtage immobilier sont fournis par le courtier concerné."]',
 '["#1","meilleur courtier","best","vendu au meilleur prix garanti","recommandé par l''OACIQ"]',
 'PENDING_REVIEW','https://www.oaciq.com','Loi sur le courtage immobilier (RLRQ c C-73.2)', now()),

-- 9. Notaire
('notary','Notaire','Notary','regulated',
 'CNQ','Chambre des notaires du Québec','https://www.cnq.org',
 'membership', true, 'Tableau de l''Ordre — Chambre des notaires du Québec', true, false,
 '["actes notariés","conseil juridique","authentification d''actes"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent","regulated_handoff"]',
 '["legal_advice","document_drafting","reserved_professional_act"]',
 true, true, true, 'RESTRICTED_PENDING_LEGAL_REVIEW', true,
 '{"membership_monthly":"PENDING_REVIEW","membership_annual":"PENDING_REVIEW","listing_subscription":"PENDING_REVIEW","appointment_fee_fixed":"PENDING_REVIEW","referral_fee_fixed":"RESTRICTED","success_fee":"RESTRICTED","percentage_commission":"RESTRICTED","affiliate_commission":"RESTRICTED"}',
 '["UNPRO facilite la sélection et la mise en relation avec des professionnels. Les conseils juridiques sont fournis par le notaire concerné."]',
 '["#1","meilleur notaire","best","conseil juridique gratuit par UNPRO"]',
 'PENDING_REVIEW','https://www.cnq.org','Loi sur le notariat (RLRQ c N-3) + Code des professions', now()),

-- 10. Ingénieur (OIQ)
('engineer','Ingénieur (OIQ)','Engineer (OIQ)','regulated',
 'OIQ','Ordre des ingénieurs du Québec','https://www.oiq.qc.ca',
 'membership', true, 'Tableau de l''Ordre des ingénieurs du Québec', true, false,
 '["actes réservés à l''ingénieur (Loi sur les ingénieurs)"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent","regulated_handoff"]',
 '["structural_opinion","engineering_design","reserved_professional_act"]',
 true, true, true, 'RESTRICTED_PENDING_LEGAL_REVIEW', true,
 '{"membership_monthly":"PENDING_REVIEW","membership_annual":"PENDING_REVIEW","listing_subscription":"PENDING_REVIEW","appointment_fee_fixed":"PENDING_REVIEW","referral_fee_fixed":"RESTRICTED","success_fee":"RESTRICTED","percentage_commission":"RESTRICTED","affiliate_commission":"RESTRICTED"}',
 '["UNPRO facilite la sélection et la mise en relation avec des professionnels. Les avis d''ingénierie sont fournis par l''ingénieur concerné."]',
 '["#1","meilleur ingénieur","best","approuvé par l''OIQ"]',
 'PENDING_REVIEW','https://www.oiq.qc.ca','Loi sur les ingénieurs (RLRQ c I-9) + Code des professions', now()),

-- 11. Architecte (OAQ)
('architect','Architecte (OAQ)','Architect (OAQ)','regulated',
 'OAQ','Ordre des architectes du Québec','https://www.oaq.com',
 'membership', true, 'Tableau de l''Ordre des architectes du Québec', true, false,
 '["actes réservés à l''architecte (Loi sur les architectes)"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent","regulated_handoff"]',
 '["architectural_design","plan_approval","reserved_professional_act"]',
 true, true, true, 'RESTRICTED_PENDING_LEGAL_REVIEW', true,
 '{"membership_monthly":"PENDING_REVIEW","membership_annual":"PENDING_REVIEW","listing_subscription":"PENDING_REVIEW","appointment_fee_fixed":"PENDING_REVIEW","referral_fee_fixed":"RESTRICTED","success_fee":"RESTRICTED","percentage_commission":"RESTRICTED","affiliate_commission":"RESTRICTED"}',
 '["UNPRO facilite la sélection et la mise en relation avec des professionnels. Les services d''architecture sont fournis par l''architecte concerné."]',
 '["#1","meilleur architecte","best","approuvé par l''OAQ"]',
 'PENDING_REVIEW','https://www.oaq.com','Loi sur les architectes (RLRQ c A-21) + Code des professions', now()),

-- 12. Technologue professionnel (OTPQ)
('professional_technologist','Technologue professionnel (OTPQ)','Professional technologist (OTPQ)','regulated',
 'OTPQ','Ordre des technologues professionnels du Québec','https://www.otpq.qc.ca',
 'membership', true, 'Tableau de l''Ordre des technologues professionnels du Québec', true, false,
 '["actes réservés au technologue professionnel"]',
 '["intent_discovery","geography","contact_capture","scheduling","category_selection","matching_explanation","referral_consent","regulated_handoff"]',
 '["reserved_professional_act","engineering_design"]',
 true, true, true, 'RESTRICTED_PENDING_LEGAL_REVIEW', true,
 '{"membership_monthly":"PENDING_REVIEW","membership_annual":"PENDING_REVIEW","listing_subscription":"PENDING_REVIEW","appointment_fee_fixed":"PENDING_REVIEW","referral_fee_fixed":"RESTRICTED","success_fee":"RESTRICTED","percentage_commission":"RESTRICTED","affiliate_commission":"RESTRICTED"}',
 '["UNPRO facilite la sélection et la mise en relation avec des professionnels."]',
 '["#1","meilleur","best","approuvé par l''OTPQ"]',
 'PENDING_REVIEW','https://www.otpq.qc.ca','Code des professions (RLRQ c C-26)', now())
ON CONFLICT (profession_code) DO NOTHING;