CREATE OR REPLACE FUNCTION public.evaluate_profession_compliance(
  _profession_code text,
  _action text,
  _compensation_type text DEFAULT NULL,
  _alex_scope text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
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