CREATE OR REPLACE FUNCTION public.manual_import_eligibility_internal(_row_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r record; d10 text; reasons text[] := '{}'; excl text[] := '{}';
  rev record; lk record; mob record; cc jsonb; has_mob boolean; has_rev boolean; has_lk boolean;
BEGIN
  SELECT * INTO r FROM acquisition_manual_import_rows WHERE id = _row_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','exclu','reasons',jsonb_build_array('dossier_introuvable')); END IF;
  d10 := right(regexp_replace(coalesce(r.phone,''),'\D','','g'),10);
  cc := coalesce(r.normalized->'crosscheck','{}'::jsonb);
  IF length(d10) <> 10 THEN excl := array_append(excl,'telephone_invalide'); END IF;
  IF r.prospect_id IS NOT NULL THEN excl := array_append(excl,'deja_prospect'); END IF;
  IF EXISTS (SELECT 1 FROM sms_opt_outs WHERE right(regexp_replace(normalized_phone,'\D','','g'),10) = d10) THEN excl := array_append(excl,'stop_opt_out'); END IF;
  IF EXISTS (SELECT 1 FROM suppression_index WHERE right(regexp_replace(coalesce(normalized_phone,''),'\D','','g'),10) = d10
             OR (r.email IS NOT NULL AND lower(normalized_email) = lower(r.email))) THEN excl := array_append(excl,'suppression'); END IF;
  IF EXISTS (SELECT 1 FROM outreach_suppressions WHERE right(regexp_replace(contact_value,'\D','','g'),10) = d10
             OR (r.email IS NOT NULL AND lower(contact_value) = lower(r.email))) THEN excl := array_append(excl,'suppression_outreach'); END IF;
  IF coalesce((cc->>'twilio_failures_30003_30006_30034')::int,0) > 0 THEN excl := array_append(excl,'echec_twilio_anterieur'); END IF;
  IF coalesce((cc->>'sms_history')::int,0) > 0 THEN excl := array_append(excl,'deja_contacte_sms'); END IF;
  IF coalesce((cc->>'duplicate_other_imports')::int,0) + coalesce((cc->>'duplicate_in_batch')::int,0) > 0 THEN excl := array_append(excl,'doublon'); END IF;

  SELECT * INTO mob FROM phone_carrier_cache WHERE right(regexp_replace(normalized_phone,'\D','','g'),10) = d10 ORDER BY validated_at DESC LIMIT 1;
  has_mob := FOUND;
  IF NOT has_mob THEN reasons := array_append(reasons,'mobile_non_verifie');
  ELSIF mob.line_type IN ('landline','fixed','tollfree','toll_free') THEN excl := array_append(excl,'ligne_non_sms_' || mob.line_type);
  ELSIF coalesce(mob.line_type,'') <> 'mobile' THEN reasons := array_append(reasons,'mobile_non_verifie_' || coalesce(mob.line_type,'inconnu'));
  ELSIF mob.validated_at < now() - interval '90 days' THEN reasons := array_append(reasons,'verification_mobile_expiree'); END IF;

  SELECT * INTO rev FROM manual_import_casl_reviews WHERE import_row_id = _row_id ORDER BY created_at DESC LIMIT 1;
  has_rev := FOUND;
  IF NOT has_rev THEN reasons := array_append(reasons,'revue_lcap_manquante');
  ELSIF rev.decision = 'refusal_found' THEN excl := array_append(excl,'refus_sollicitation');
  ELSIF rev.decision <> 'evidence_documented' THEN reasons := array_append(reasons,'preuve_lcap_insuffisante');
  ELSIF rev.created_at < now() - interval '180 days' THEN reasons := array_append(reasons,'revue_lcap_expiree'); END IF;

  SELECT * INTO lk FROM manual_import_claim_links WHERE import_row_id = _row_id AND revoked_at IS NULL LIMIT 1;
  has_lk := FOUND;
  IF NOT has_lk THEN reasons := array_append(reasons,'lien_350_absent');
  ELSIF lk.expires_at <= now() THEN reasons := array_append(reasons,'lien_350_expire');
  ELSIF lk.claim_status = 'rejected' THEN excl := array_append(excl,'revendication_rejetee'); END IF;

  IF coalesce(trim(r.company),'') = '' THEN reasons := array_append(reasons,'entreprise_non_confirmee'); END IF;

  RETURN jsonb_build_object(
    'status', CASE WHEN array_length(excl,1) > 0 THEN 'exclu' WHEN array_length(reasons,1) > 0 THEN 'a_qualifier' ELSE 'admissible_sur_preuve' END,
    'reasons', to_jsonb(excl || reasons), 'computed_at', now(),
    'note', 'Admissible ne déclenche aucun envoi; mise en file = action distincte.');
END $function$;
REVOKE ALL ON FUNCTION public.manual_import_eligibility_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manual_import_eligibility_internal(uuid) TO service_role;