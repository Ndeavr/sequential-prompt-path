-- Phase 2 — Data Integrity: prospect normalization, dedupe detection, merge

-- 1. Normalization columns on contractor_prospects
ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS phone_normalization_status text,
  ADD COLUMN IF NOT EXISTS email_normalized text,
  ADD COLUMN IF NOT EXISTS company_name_normalized text,
  ADD COLUMN IF NOT EXISTS website_normalized text,
  ADD COLUMN IF NOT EXISTS normalized_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cp_phone_e164 ON public.contractor_prospects(phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_email_normalized ON public.contractor_prospects(email_normalized) WHERE email_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_company_norm ON public.contractor_prospects(company_name_normalized) WHERE company_name_normalized IS NOT NULL;

-- 2. Normalization trigger
CREATE OR REPLACE FUNCTION public.trg_normalize_contractor_prospect()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE digits text; core text;
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email_normalized := NULLIF(lower(regexp_replace(NEW.email, '[\u200B-\u200D\uFEFF\u00A0\s]', '', 'g')), '');
    IF NEW.email_normalized IS NOT NULL AND NEW.email_normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      NEW.email_normalized := NULL;
    END IF;
  END IF;

  IF NEW.website_url IS NOT NULL AND btrim(NEW.website_url) <> '' THEN
    NEW.website_normalized := btrim(NEW.website_url);
    IF NEW.website_normalized !~* '^https?://' THEN
      NEW.website_normalized := 'https://' || NEW.website_normalized;
    END IF;
    NEW.website_normalized := lower(regexp_replace(NEW.website_normalized, '/+$', ''));
  END IF;

  IF NEW.business_name IS NOT NULL THEN
    BEGIN
      NEW.company_name_normalized := NULLIF(btrim(regexp_replace(
        lower(public.unaccent(NEW.business_name)), '[^a-z0-9]+', ' ', 'g')), '');
    EXCEPTION WHEN undefined_function THEN
      NEW.company_name_normalized := NULLIF(btrim(regexp_replace(
        lower(NEW.business_name), '[^a-z0-9]+', ' ', 'g')), '');
    END;
  END IF;

  digits := regexp_replace(COALESCE(NEW.phone, ''), '[^0-9]', '', 'g');
  IF digits <> '' THEN
    NEW.phone_normalized := digits;
    core := digits;
    IF length(core) = 11 AND left(core,1) = '1' THEN core := substr(core,2); END IF;
    IF length(core) = 10 AND left(core,1) NOT IN ('0','1') THEN
      NEW.phone_e164 := '+1' || core;
      IF core ~ '^\d{3}555\d{4}$' OR core ~ '^(\d)\1{9}$' THEN
        NEW.phone_e164 := NULL;
        NEW.phone_normalization_status := 'test';
      ELSE
        NEW.phone_normalization_status := 'valid';
      END IF;
    ELSE
      NEW.phone_normalization_status := 'invalid';
    END IF;
  END IF;

  NEW.normalized_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_normalize_contractor_prospect ON public.contractor_prospects;
CREATE TRIGGER trg_normalize_contractor_prospect
  BEFORE INSERT OR UPDATE OF phone, email, business_name, website_url
  ON public.contractor_prospects
  FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_contractor_prospect();

-- Backfill
UPDATE public.contractor_prospects SET phone = phone WHERE phone_e164 IS NULL AND phone IS NOT NULL;
UPDATE public.contractor_prospects SET email = email WHERE email_normalized IS NULL AND email IS NOT NULL;
UPDATE public.contractor_prospects SET business_name = business_name WHERE company_name_normalized IS NULL AND business_name IS NOT NULL;

-- 3. Duplicate detection
CREATE OR REPLACE FUNCTION public.detect_prospect_duplicates(p_prospect_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  src record; match record; score numeric; signals jsonb; created_count integer := 0;
BEGIN
  SELECT * INTO src FROM public.contractor_prospects WHERE id = p_prospect_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR match IN
    SELECT * FROM public.contractor_prospects
    WHERE id <> p_prospect_id
      AND (
        (src.neq IS NOT NULL AND neq = src.neq)
        OR (src.phone_e164 IS NOT NULL AND phone_e164 = src.phone_e164)
        OR (src.google_place_id IS NOT NULL AND google_place_id = src.google_place_id)
        OR (src.email_normalized IS NOT NULL AND email_normalized = src.email_normalized)
        OR (src.rbq IS NOT NULL AND rbq = src.rbq)
        OR (src.company_name_normalized IS NOT NULL AND src.city IS NOT NULL
            AND company_name_normalized = src.company_name_normalized AND city = src.city)
        OR (src.normalized_domain IS NOT NULL AND normalized_domain = src.normalized_domain)
      )
    LIMIT 25
  LOOP
    score := 0; signals := '{}'::jsonb;
    IF src.neq IS NOT NULL AND match.neq = src.neq THEN
      score := GREATEST(score, 1.00); signals := signals || jsonb_build_object('neq', true);
    END IF;
    IF src.google_place_id IS NOT NULL AND match.google_place_id = src.google_place_id THEN
      score := GREATEST(score, 1.00); signals := signals || jsonb_build_object('google_place_id', true);
    END IF;
    IF src.phone_e164 IS NOT NULL AND match.phone_e164 = src.phone_e164 THEN
      score := GREATEST(score, 0.95); signals := signals || jsonb_build_object('phone_e164', true);
    END IF;
    IF src.email_normalized IS NOT NULL AND match.email_normalized = src.email_normalized THEN
      score := GREATEST(score, 0.90); signals := signals || jsonb_build_object('email', true);
    END IF;
    IF src.rbq IS NOT NULL AND match.rbq = src.rbq THEN
      score := GREATEST(score, 0.90); signals := signals || jsonb_build_object('rbq', true);
    END IF;
    IF src.company_name_normalized IS NOT NULL AND match.company_name_normalized = src.company_name_normalized
       AND src.city IS NOT NULL AND match.city = src.city THEN
      score := GREATEST(score, 0.80); signals := signals || jsonb_build_object('company_city', true);
    END IF;
    IF src.normalized_domain IS NOT NULL AND match.normalized_domain = src.normalized_domain THEN
      score := GREATEST(score, 0.75); signals := signals || jsonb_build_object('normalized_domain', true);
    END IF;

    IF score >= 0.60 THEN
      INSERT INTO public.prospect_dedupe_reviews
        (candidate_prospect_id, existing_prospect_id, confidence, signals, new_payload, status)
      VALUES (p_prospect_id, match.id, score, signals, to_jsonb(src), 'pending')
      ON CONFLICT DO NOTHING;
      created_count := created_count + 1;
    END IF;
  END LOOP;

  RETURN created_count;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.trg_prospect_autodetect_duplicates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN PERFORM public.detect_prospect_duplicates(NEW.id); RETURN NEW; END;
$fn$;

DROP TRIGGER IF EXISTS trg_prospect_autodetect_duplicates ON public.contractor_prospects;
CREATE TRIGGER trg_prospect_autodetect_duplicates
  AFTER INSERT OR UPDATE OF phone_e164, email_normalized, neq, rbq, google_place_id, company_name_normalized
  ON public.contractor_prospects
  FOR EACH ROW EXECUTE FUNCTION public.trg_prospect_autodetect_duplicates();

-- 4. Merge contractor_prospects
CREATE OR REPLACE FUNCTION public.merge_contractor_prospects(
  p_keep_id uuid, p_drop_id uuid, p_admin_id uuid DEFAULT NULL, p_reason text DEFAULT 'manual_merge'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  fk record; reparented jsonb := '{}'::jsonb; row_count integer;
  keep_row record; drop_row record;
  fillable text[] := ARRAY['phone','email','website_url','google_business_url','address','postal_code',
    'owner_name','legal_name','rbq','neq','normalized_domain','google_place_id',
    'category_slug','trade','region','province'];
  c text;
BEGIN
  IF p_keep_id = p_drop_id THEN RAISE EXCEPTION 'keep_id cannot equal drop_id'; END IF;
  SELECT * INTO keep_row FROM public.contractor_prospects WHERE id = p_keep_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'keep prospect not found'; END IF;
  SELECT * INTO drop_row FROM public.contractor_prospects WHERE id = p_drop_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'drop prospect not found'; END IF;

  FOREACH c IN ARRAY fillable LOOP
    EXECUTE format(
      'UPDATE public.contractor_prospects SET %1$I = COALESCE(NULLIF(%1$I::text, %2$L)::text, $1) WHERE id = $2 AND (%1$I IS NULL OR %1$I::text = %2$L)',
      c, ''
    ) USING (to_jsonb(drop_row) ->> c), p_keep_id;
  END LOOP;

  FOR fk IN
    SELECT conrelid::regclass::text AS child_table, a.attname AS child_col
    FROM pg_constraint pc
    JOIN pg_attribute a ON a.attrelid = pc.conrelid AND a.attnum = ANY(pc.conkey)
    WHERE pc.contype = 'f' AND pc.confrelid = 'public.contractor_prospects'::regclass
  LOOP
    BEGIN
      EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', fk.child_table, fk.child_col, fk.child_col)
        USING p_keep_id, p_drop_id;
      GET DIAGNOSTICS row_count = ROW_COUNT;
      IF row_count > 0 THEN
        reparented := reparented || jsonb_build_object(fk.child_table || '.' || fk.child_col, row_count);
      END IF;
    EXCEPTION WHEN unique_violation THEN
      EXECUTE format('DELETE FROM %s WHERE %I = $1', fk.child_table, fk.child_col) USING p_drop_id;
      reparented := reparented || jsonb_build_object(fk.child_table || '.' || fk.child_col, 'conflict_deleted');
    END;
  END LOOP;

  DELETE FROM public.contractor_prospects WHERE id = p_drop_id;

  INSERT INTO public.system_audit_logs (action, entity_type, entity_id, actor_id, payload)
  VALUES ('merge_contractor_prospects', 'contractor_prospect', p_keep_id, p_admin_id,
    jsonb_build_object('keep_id', p_keep_id, 'drop_id', p_drop_id, 'reason', p_reason,
      'reparented', reparented, 'drop_snapshot', to_jsonb(drop_row)));

  RETURN jsonb_build_object('success', true, 'keep_id', p_keep_id, 'drop_id', p_drop_id, 'reparented', reparented);
END;
$fn$;

-- 5. Merge contractor_leads
CREATE OR REPLACE FUNCTION public.merge_contractor_leads(
  p_keep_id uuid, p_drop_id uuid, p_admin_id uuid DEFAULT NULL, p_reason text DEFAULT 'manual_merge'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE fk record; reparented jsonb := '{}'::jsonb; row_count integer; drop_row record;
BEGIN
  IF p_keep_id = p_drop_id THEN RAISE EXCEPTION 'keep_id cannot equal drop_id'; END IF;
  SELECT * INTO drop_row FROM public.contractor_leads WHERE id = p_drop_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'drop lead not found'; END IF;

  FOR fk IN
    SELECT conrelid::regclass::text AS child_table, a.attname AS child_col
    FROM pg_constraint pc
    JOIN pg_attribute a ON a.attrelid = pc.conrelid AND a.attnum = ANY(pc.conkey)
    WHERE pc.contype = 'f' AND pc.confrelid = 'public.contractor_leads'::regclass
  LOOP
    BEGIN
      EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', fk.child_table, fk.child_col, fk.child_col)
        USING p_keep_id, p_drop_id;
      GET DIAGNOSTICS row_count = ROW_COUNT;
      IF row_count > 0 THEN
        reparented := reparented || jsonb_build_object(fk.child_table || '.' || fk.child_col, row_count);
      END IF;
    EXCEPTION WHEN unique_violation THEN
      EXECUTE format('DELETE FROM %s WHERE %I = $1', fk.child_table, fk.child_col) USING p_drop_id;
      reparented := reparented || jsonb_build_object(fk.child_table || '.' || fk.child_col, 'conflict_deleted');
    END;
  END LOOP;

  DELETE FROM public.contractor_leads WHERE id = p_drop_id;

  INSERT INTO public.system_audit_logs (action, entity_type, entity_id, actor_id, payload)
  VALUES ('merge_contractor_leads', 'contractor_lead', p_keep_id, p_admin_id,
    jsonb_build_object('keep_id', p_keep_id, 'drop_id', p_drop_id, 'reason', p_reason,
      'reparented', reparented, 'drop_snapshot', to_jsonb(drop_row)));

  RETURN jsonb_build_object('success', true, 'keep_id', p_keep_id, 'drop_id', p_drop_id, 'reparented', reparented);
END;
$fn$;

-- 6. Secondary contact sync
CREATE OR REPLACE FUNCTION public.promote_prospect_contact(
  p_prospect_id uuid, p_contact_type text, p_contact_value text, p_is_primary boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE contact_id uuid;
BEGIN
  IF p_contact_value IS NULL OR btrim(p_contact_value) = '' THEN RETURN NULL; END IF;
  SELECT id INTO contact_id FROM public.contractor_prospect_contacts
    WHERE prospect_id = p_prospect_id AND contact_type = p_contact_type
      AND lower(contact_value) = lower(p_contact_value) LIMIT 1;
  IF contact_id IS NULL THEN
    INSERT INTO public.contractor_prospect_contacts
      (prospect_id, contact_type, contact_value, is_primary, verified_status)
    VALUES (p_prospect_id, p_contact_type, p_contact_value, p_is_primary, 'unverified')
    RETURNING id INTO contact_id;
  ELSIF p_is_primary THEN
    UPDATE public.contractor_prospect_contacts SET is_primary = true WHERE id = contact_id;
  END IF;
  RETURN contact_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.trg_sync_prospect_contacts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF NEW.email_normalized IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.email_normalized IS DISTINCT FROM OLD.email_normalized) THEN
    PERFORM public.promote_prospect_contact(NEW.id, 'email', NEW.email_normalized, true);
  END IF;
  IF NEW.phone_e164 IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.phone_e164 IS DISTINCT FROM OLD.phone_e164) THEN
    PERFORM public.promote_prospect_contact(NEW.id, 'phone', NEW.phone_e164, true);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_sync_prospect_contacts ON public.contractor_prospects;
CREATE TRIGGER trg_sync_prospect_contacts
  AFTER INSERT OR UPDATE OF phone_e164, email_normalized
  ON public.contractor_prospects
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_prospect_contacts();

-- 7. Integrity report
CREATE OR REPLACE FUNCTION public.pipeline_data_integrity_report()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'prospects_total', (SELECT count(*) FROM public.contractor_prospects),
    'prospects_missing_phone_e164', (SELECT count(*) FROM public.contractor_prospects WHERE phone IS NOT NULL AND phone_e164 IS NULL),
    'prospects_missing_email_norm', (SELECT count(*) FROM public.contractor_prospects WHERE email IS NOT NULL AND email_normalized IS NULL),
    'prospects_dup_pending', (SELECT count(*) FROM public.prospect_dedupe_reviews WHERE status = 'pending'),
    'prospects_dup_high_conf', (SELECT count(*) FROM public.prospect_dedupe_reviews WHERE status = 'pending' AND confidence >= 0.90),
    'leads_total', (SELECT count(*) FROM public.contractor_leads),
    'leads_missing_phone_e164', (SELECT count(*) FROM public.contractor_leads WHERE phone IS NOT NULL AND phone_e164 IS NULL),
    'leads_missing_email_norm', (SELECT count(*) FROM public.contractor_leads WHERE email IS NOT NULL AND email_normalized IS NULL),
    'orphan_prospect_contacts', (
      SELECT count(*) FROM public.contractor_prospect_contacts c
      LEFT JOIN public.contractor_prospects p ON p.id = c.prospect_id
      WHERE p.id IS NULL
    ),
    'generated_at', now()
  ) INTO result;
  RETURN result;
END;
$fn$;

-- 8. Unified view
CREATE OR REPLACE VIEW public.v_acquisition_contacts_unified
WITH (security_invoker = on) AS
SELECT 'prospect'::text AS source, id, business_name AS name, city,
  phone_e164, email_normalized AS email, company_name_normalized AS name_key,
  outreach_status, activation_status, created_at
FROM public.contractor_prospects
UNION ALL
SELECT 'lead'::text AS source, id, COALESCE(company_name, full_name) AS name, city,
  phone_e164, email_normalized AS email, company_name_normalized AS name_key,
  outreach_status, activation_status, created_at
FROM public.contractor_leads;

GRANT SELECT ON public.v_acquisition_contacts_unified TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_prospect_duplicates(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_contractor_prospects(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_contractor_leads(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_prospect_contact(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pipeline_data_integrity_report() TO authenticated;