CREATE OR REPLACE FUNCTION public.affiliate_stage_import(p_rows jsonb, p_source_type text, p_file_name text, p_batch_hash text)
RETURNS TABLE(row_index integer, status text, next_action text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_aff uuid; v_batch uuid; v_existing uuid; r jsonb; i int := 0;
  v_name text; v_namen text; v_phone text; v_email text; v_dom text; v_city text;
  v_status text; v_next text; v_dup uuid; v_lead record;
  c_valid int := 0; c_dup int := 0; c_inv int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501'; END IF;
  SELECT af.id INTO v_aff FROM affiliates af WHERE af.user_id = auth.uid() AND coalesce(af.status,'active') NOT IN ('suspended','revoked','inactive') ORDER BY af.created_at LIMIT 1;
  IF v_aff IS NULL THEN RAISE EXCEPTION 'affiliate_required' USING ERRCODE = '42501'; END IF;
  IF p_source_type NOT IN ('manual','paste','csv','xlsx','photo','pdf','website') THEN RAISE EXCEPTION 'invalid_source_type'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN RAISE EXCEPTION 'empty_import'; END IF;
  IF jsonb_array_length(p_rows) > 100 THEN RAISE EXCEPTION 'too_many_rows'; END IF;
  IF p_batch_hash IS NULL OR length(p_batch_hash) < 16 THEN RAISE EXCEPTION 'batch_hash_required'; END IF;

  SELECT b.id INTO v_existing FROM affiliate_import_batches b WHERE b.affiliate_id = v_aff AND b.batch_hash = p_batch_hash;
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT (ir.normalized_data->>'row_index')::int, ir.validation_status, ir.normalized_data->>'next_action'
      FROM affiliate_import_rows ir WHERE ir.batch_id = v_existing ORDER BY 1;
    RETURN;
  END IF;
  IF (SELECT count(*) FROM affiliate_import_batches b WHERE b.affiliate_id = v_aff AND b.created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'import_rate_limited';
  END IF;

  INSERT INTO affiliate_import_batches(affiliate_id, file_name, source_type, total_rows, status, created_by, batch_hash)
  VALUES (v_aff, left(p_file_name, 200), p_source_type, jsonb_array_length(p_rows), 'staged', auth.uid(), p_batch_hash)
  RETURNING id INTO v_batch;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    i := i + 1; v_dup := NULL; v_lead := NULL;
    v_name := nullif(btrim(left(r->>'company_name', 200)), '');
    v_namen := nullif(regexp_replace(lower(coalesce(v_name,'')), '[^a-z0-9àâäéèêëîïôöùûüç]', '', 'g'), '');
    v_phone := nullif(right(regexp_replace(coalesce(r->>'phone',''), '\D', '', 'g'), 10), '');
    IF v_phone IS NOT NULL AND length(v_phone) <> 10 THEN v_phone := NULL; END IF;
    v_email := nullif(lower(btrim(coalesce(r->>'email',''))), '');
    IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN v_email := NULL; END IF;
    v_dom := nullif(split_part(regexp_replace(lower(btrim(coalesce(r->>'website',''))), '^(https?://)?(www\.)?', ''), '/', 1), '');
    v_city := nullif(btrim(left(r->>'city', 100)), '');

    IF v_namen IS NULL OR length(v_namen) < 2 OR (v_phone IS NULL AND v_email IS NULL AND v_dom IS NULL) THEN
      v_status := 'invalid'; v_next := 'Compléter le nom et au moins un téléphone, courriel ou site';
    ELSIF EXISTS (SELECT 1 FROM contractors c WHERE
        (v_phone IS NOT NULL AND right(regexp_replace(coalesce(c.phone,''),'\D','','g'),10) = v_phone)
        OR (v_email IS NOT NULL AND lower(c.email) = v_email)
        OR (v_dom IS NOT NULL AND split_part(regexp_replace(lower(coalesce(c.website,'')), '^(https?://)?(www\.)?', ''), '/', 1) = v_dom)) THEN
      v_status := 'client'; v_next := 'Déjà inscrit chez UNPRO — aucune action';
    ELSE
      SELECT l.id, l.created_by_affiliate_id, l.assigned_affiliate_id INTO v_lead FROM contractor_leads l WHERE
        (v_phone IS NOT NULL AND right(regexp_replace(coalesce(l.phone_e164,''),'\D','','g'),10) = v_phone)
        OR (v_email IS NOT NULL AND l.email_normalized = v_email)
        OR (v_dom IS NOT NULL AND l.website_normalized = v_dom)
      ORDER BY l.created_at LIMIT 1;
      IF v_lead.id IS NOT NULL AND (v_lead.created_by_affiliate_id = v_aff OR v_lead.assigned_affiliate_id = v_aff) THEN
        v_status := 'own'; v_dup := v_lead.id; v_next := 'Déjà dans vos dossiers — ouvrir la fiche existante';
      ELSIF v_lead.id IS NOT NULL AND v_lead.assigned_affiliate_id IS NOT NULL THEN
        v_status := 'reserved_elsewhere'; v_next := 'Suivi déjà réservé — demander une révision avec preuve';
      ELSIF v_lead.id IS NOT NULL THEN
        v_status := 'exists'; v_next := 'Dossier déjà existant chez UNPRO — contrôle manuel';
      ELSIF v_phone IS NOT NULL AND EXISTS (SELECT 1 FROM crm_manual_assignments a JOIN verified_contractor_prospects v ON v.id = a.prospect_id
             WHERE a.status IN ('assigned','in_progress') AND right(regexp_replace(coalesce(v.phone_e164,''),'\D','','g'),10) = v_phone AND a.affiliate_id IS DISTINCT FROM v_aff) THEN
        v_status := 'reserved_elsewhere'; v_next := 'Suivi déjà réservé — demander une révision avec preuve';
      ELSIF EXISTS (SELECT 1 FROM contractor_prospects p WHERE
          (v_phone IS NOT NULL AND right(regexp_replace(coalesce(p.phone_e164, p.phone, ''),'\D','','g'),10) = v_phone)
          OR (v_email IS NOT NULL AND p.email_normalized = v_email)
          OR (v_dom IS NOT NULL AND p.website_normalized = v_dom))
        OR EXISTS (SELECT 1 FROM verified_contractor_prospects v WHERE
          (v_phone IS NOT NULL AND right(regexp_replace(coalesce(v.phone_e164,''),'\D','','g'),10) = v_phone)
          OR (v_email IS NOT NULL AND lower(v.email) = v_email)) THEN
        v_status := 'exists'; v_next := 'Dossier déjà existant chez UNPRO — contrôle manuel';
      ELSIF EXISTS (SELECT 1 FROM contractor_leads l WHERE l.company_name_normalized = v_namen AND v_city IS NOT NULL AND lower(l.city) = lower(v_city))
         OR EXISTS (SELECT 1 FROM contractor_prospects p WHERE p.company_name_normalized = v_namen AND v_city IS NOT NULL AND lower(p.city) = lower(v_city)) THEN
        v_status := 'review'; v_next := 'Nom semblable déjà connu — à examiner avant tout contact';
      ELSE
        v_status := 'new'; v_next := 'Confirmer l''identité, vérifier téléphone + RBQ et consentement';
      END IF;
    END IF;

    IF v_status = 'invalid' THEN c_inv := c_inv + 1;
    ELSIF v_status = 'new' THEN c_valid := c_valid + 1;
    ELSE c_dup := c_dup + 1; END IF;

    INSERT INTO affiliate_import_rows(batch_id, raw_data, normalized_data, validation_status, duplicate_prospect_id)
    VALUES (v_batch, r, jsonb_build_object(
      'row_index', i, 'company_name', v_name, 'phone_10', v_phone, 'email', v_email, 'domain', v_dom, 'city', v_city,
      'category', nullif(btrim(left(r->>'category',100)),''),
      'next_action', v_next, 'provenance', jsonb_build_object('source', p_source_type, 'author', auth.uid(), 'at', now(), 'status', 'DÉCLARÉ'),
      'rbq', 'PENDING', 'consent', 'PENDING', 'reserved', false),
      v_status, v_dup);
    row_index := i; status := v_status; next_action := v_next; RETURN NEXT;
  END LOOP;

  UPDATE affiliate_import_batches SET valid_rows = c_valid, duplicate_rows = c_dup, invalid_rows = c_inv, imported_rows = 0, completed_at = now() WHERE id = v_batch;
END $$;
REVOKE ALL ON FUNCTION public.affiliate_stage_import(jsonb, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.affiliate_stage_import(jsonb, text, text, text) TO authenticated, service_role;