CREATE OR REPLACE FUNCTION public.manual_import_eligibility_internal(_row_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; d10 text; reasons text[] := '{}'; excl text[] := '{}';
  rev record; lk record; mob record; cc jsonb;
BEGIN
  SELECT * INTO r FROM acquisition_manual_import_rows WHERE id = _row_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','exclu','reasons',jsonb_build_array('dossier_introuvable')); END IF;
  d10 := right(regexp_replace(coalesce(r.phone,''),'\D','','g'),10);
  cc := coalesce(r.normalized->'crosscheck','{}'::jsonb);
  IF length(d10) <> 10 THEN excl := excl || 'telephone_invalide'; END IF;
  IF r.prospect_id IS NOT NULL THEN excl := excl || 'deja_prospect'; END IF;
  IF EXISTS (SELECT 1 FROM sms_opt_outs WHERE right(regexp_replace(normalized_phone,'\D','','g'),10) = d10) THEN excl := excl || 'stop_opt_out'; END IF;
  IF EXISTS (SELECT 1 FROM suppression_index WHERE right(regexp_replace(coalesce(normalized_phone,''),'\D','','g'),10) = d10
             OR (r.email IS NOT NULL AND lower(normalized_email) = lower(r.email))) THEN excl := excl || 'suppression'; END IF;
  IF EXISTS (SELECT 1 FROM outreach_suppressions WHERE right(regexp_replace(contact_value,'\D','','g'),10) = d10
             OR (r.email IS NOT NULL AND lower(contact_value) = lower(r.email))) THEN excl := excl || 'suppression_outreach'; END IF;
  IF coalesce((cc->>'twilio_failures_30003_30006_30034')::int,0) > 0 THEN excl := excl || 'echec_twilio_anterieur'; END IF;
  IF coalesce((cc->>'sms_history')::int,0) > 0 THEN excl := excl || 'deja_contacte_sms'; END IF;
  IF coalesce((cc->>'duplicate_other_imports')::int,0) + coalesce((cc->>'duplicate_in_batch')::int,0) > 0 THEN excl := excl || 'doublon'; END IF;

  SELECT * INTO mob FROM phone_carrier_cache WHERE right(regexp_replace(normalized_phone,'\D','','g'),10) = d10 ORDER BY validated_at DESC LIMIT 1;
  IF mob IS NULL THEN reasons := reasons || 'mobile_non_verifie';
  ELSIF mob.line_type IN ('landline','fixed','tollfree','toll_free') THEN excl := excl || ('ligne_non_sms_' || mob.line_type);
  ELSIF mob.line_type <> 'mobile' THEN reasons := reasons || ('mobile_non_verifie_' || mob.line_type);
  ELSIF mob.validated_at < now() - interval '90 days' THEN reasons := reasons || 'verification_mobile_expiree'; END IF;

  SELECT * INTO rev FROM manual_import_casl_reviews WHERE import_row_id = _row_id ORDER BY created_at DESC LIMIT 1;
  IF rev IS NULL THEN reasons := reasons || 'revue_lcap_manquante';
  ELSIF rev.decision = 'refusal_found' THEN excl := excl || 'refus_sollicitation';
  ELSIF rev.decision <> 'evidence_documented' THEN reasons := reasons || 'preuve_lcap_insuffisante';
  ELSIF rev.created_at < now() - interval '180 days' THEN reasons := reasons || 'revue_lcap_expiree'; END IF;

  SELECT * INTO lk FROM manual_import_claim_links WHERE import_row_id = _row_id AND revoked_at IS NULL LIMIT 1;
  IF lk IS NULL THEN reasons := reasons || 'lien_350_absent';
  ELSIF lk.expires_at <= now() THEN reasons := reasons || 'lien_350_expire';
  ELSIF lk.claim_status = 'rejected' THEN excl := excl || 'revendication_rejetee'; END IF;

  IF coalesce(trim(r.company),'') = '' THEN reasons := reasons || 'entreprise_non_confirmee'; END IF;

  RETURN jsonb_build_object(
    'status', CASE WHEN array_length(excl,1) > 0 THEN 'exclu' WHEN array_length(reasons,1) > 0 THEN 'a_qualifier' ELSE 'admissible_sur_preuve' END,
    'reasons', to_jsonb(excl || reasons), 'computed_at', now(),
    'note', 'Admissible ne déclenche aucun envoi; mise en file = action distincte.');
END $$;
REVOKE ALL ON FUNCTION public.manual_import_eligibility_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manual_import_eligibility_internal(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.manual_import_batch_eligibility(_source text)
RETURNS TABLE(row_id uuid, status text, reasons jsonb) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT x.id, e->>'status', e->'reasons'
    FROM acquisition_manual_import_rows x
    JOIN acquisition_manual_import_batches b ON b.id = x.batch_id AND b.source = _source
    CROSS JOIN LATERAL public.manual_import_eligibility_internal(x.id) e;
END $$;
REVOKE ALL ON FUNCTION public.manual_import_batch_eligibility(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manual_import_batch_eligibility(text) TO authenticated, service_role;

-- Garde dure : aucun dossier ne devient envoyable sans admissibilité calculée serveur.
CREATE OR REPLACE FUNCTION public.manual_import_rows_send_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (coalesce(NEW.normalized->>'send_enabled','false') = 'true' OR coalesce(NEW.normalized->>'dispatchable','false') = 'true')
     AND (public.manual_import_eligibility_internal(NEW.id)->>'status') <> 'admissible_sur_preuve' THEN
    RAISE EXCEPTION 'manual_import_not_eligible' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_manual_import_rows_send_guard ON public.acquisition_manual_import_rows;
CREATE TRIGGER trg_manual_import_rows_send_guard BEFORE INSERT OR UPDATE ON public.acquisition_manual_import_rows
FOR EACH ROW EXECUTE FUNCTION public.manual_import_rows_send_guard();