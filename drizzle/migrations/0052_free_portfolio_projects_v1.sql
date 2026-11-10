-- Free "Montrez vos réalisations" V1: moderation, consent, server-side 10/company cap.
-- Table had 0 rows and no API grants when this migration was written.

ALTER TABLE public.contractor_portfolio_projects
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS photo_rights_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS show_company_name boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_request_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_free_tier boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'free_portfolio_entry',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.contractor_portfolio_projects
  ADD CONSTRAINT contractor_portfolio_projects_status_chk
  CHECK (status IN ('pending','approved','rejected','withdrawn'));

CREATE UNIQUE INDEX IF NOT EXISTS contractor_portfolio_projects_client_request_uidx
  ON public.contractor_portfolio_projects(client_request_id) WHERE client_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS contractor_portfolio_projects_feed_idx
  ON public.contractor_portfolio_projects(published_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS contractor_portfolio_projects_contractor_status_idx
  ON public.contractor_portfolio_projects(contractor_id, status);
CREATE INDEX IF NOT EXISTS contractor_portfolio_projects_submitter_idx
  ON public.contractor_portfolio_projects(submitted_by, created_at DESC);

COMMENT ON COLUMN public.contractor_portfolio_projects.gallery_urls IS
  'JSON array (1-4) of object paths in the private storage bucket portfolio-submissions; never public URLs.';
COMMENT ON COLUMN public.contractor_portfolio_projects.status IS
  'pending -> approved|rejected by human admin moderation; withdrawn by the owner. Only approved rows are ever shown publicly.';

-- Remove the unmoderated anonymous read and direct client writes; all writes go through RPCs below.
DROP POLICY IF EXISTS public_read_portfolio ON public.contractor_portfolio_projects;
DROP POLICY IF EXISTS owner_insert_contractor_portfolio_projects ON public.contractor_portfolio_projects;
DROP POLICY IF EXISTS owner_update_contractor_portfolio_projects ON public.contractor_portfolio_projects;
DROP POLICY IF EXISTS owner_delete_contractor_portfolio_projects ON public.contractor_portfolio_projects;

REVOKE ALL ON public.contractor_portfolio_projects FROM anon;
GRANT SELECT ON public.contractor_portfolio_projects TO authenticated;
GRANT ALL ON public.contractor_portfolio_projects TO service_role;
ALTER TABLE public.contractor_portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Storage helpers -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.portfolio_object_is_public(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contractor_portfolio_projects p
    WHERE p.status = 'approved' AND p.gallery_urls ? p_name
  );
$$;

CREATE OR REPLACE FUNCTION public.portfolio_object_in_use(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contractor_portfolio_projects p
    WHERE p.status IN ('pending','approved') AND p.gallery_urls ? p_name
  );
$$;
REVOKE ALL ON FUNCTION public.portfolio_object_is_public(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portfolio_object_in_use(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portfolio_object_is_public(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portfolio_object_in_use(text) TO authenticated, service_role;

CREATE POLICY portfolio_submissions_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY portfolio_submissions_owner_or_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'portfolio-submissions' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY portfolio_submissions_public_read_approved ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'portfolio-submissions' AND public.portfolio_object_is_public(name));
CREATE POLICY portfolio_submissions_owner_delete_unused ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio-submissions' AND (storage.foldername(name))[1] = auth.uid()::text AND NOT public.portfolio_object_in_use(name));

-- Quota ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_portfolio_free_quota()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_contractor uuid; v_used int := 0; v_approved int := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('authenticated', false, 'limit', 10); END IF;
  SELECT id INTO v_contractor FROM public.contractors WHERE user_id = v_uid ORDER BY created_at LIMIT 1;
  IF v_contractor IS NOT NULL THEN
    SELECT count(*) FILTER (WHERE status IN ('pending','approved')), count(*) FILTER (WHERE status = 'approved')
      INTO v_used, v_approved
      FROM public.contractor_portfolio_projects WHERE contractor_id = v_contractor AND is_free_tier;
  END IF;
  RETURN jsonb_build_object('authenticated', true, 'contractor_id', v_contractor,
    'used', v_used, 'approved', v_approved, 'limit', 10);
END; $$;
REVOKE ALL ON FUNCTION public.my_portfolio_free_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_portfolio_free_quota() TO authenticated, service_role;

-- Submit --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_portfolio_project(
  p_client_request_id uuid,
  p_business_name text,
  p_contact_email text,
  p_contact_phone text,
  p_title text,
  p_service_name text,
  p_city text,
  p_description text,
  p_photo_paths text[],
  p_before_path text,
  p_after_path text,
  p_photo_rights boolean,
  p_show_company_name boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contractor uuid;
  v_existing record;
  v_paths text[];
  v_path text;
  v_used int;
  v_user_used int;
  v_recent int;
  v_id uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_service text := btrim(coalesce(p_service_name, ''));
  v_city text := btrim(coalesce(p_city, ''));
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_name text := btrim(coalesce(p_business_name, ''));
  v_email text := nullif(lower(btrim(coalesce(p_contact_email, ''))), '');
  v_phone text := nullif(regexp_replace(coalesce(p_contact_phone, ''), '[^0-9+]', '', 'g'), '');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v_uid
                 AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'account_not_verified' USING ERRCODE = '42501';
  END IF;
  IF p_client_request_id IS NULL THEN RAISE EXCEPTION 'client_request_required'; END IF;

  SELECT id, status INTO v_existing FROM public.contractor_portfolio_projects WHERE client_request_id = p_client_request_id;
  IF FOUND THEN
    RETURN jsonb_build_object('result', 'already_submitted', 'id', v_existing.id, 'status', v_existing.status);
  END IF;

  IF p_photo_rights IS NOT TRUE THEN RAISE EXCEPTION 'photo_rights_required'; END IF;
  IF length(v_title) < 3 OR length(v_title) > 120 THEN RAISE EXCEPTION 'invalid_title'; END IF;
  IF length(v_service) < 2 OR length(v_service) > 80 THEN RAISE EXCEPTION 'invalid_service'; END IF;
  IF length(v_city) < 2 OR length(v_city) > 80 OR v_city ~ '[0-9]' THEN RAISE EXCEPTION 'city_must_be_general'; END IF;
  IF v_desc IS NOT NULL AND length(v_desc) > 600 THEN RAISE EXCEPTION 'invalid_description'; END IF;

  SELECT array_agg(DISTINCT x) INTO v_paths FROM unnest(coalesce(p_photo_paths, '{}'::text[])) AS x WHERE x IS NOT NULL AND x <> '';
  IF v_paths IS NULL OR array_length(v_paths, 1) < 1 OR array_length(v_paths, 1) > 4 THEN RAISE EXCEPTION 'photo_count_1_to_4'; END IF;
  IF p_before_path IS NOT NULL AND NOT (p_before_path = ANY(v_paths)) THEN RAISE EXCEPTION 'invalid_before_photo'; END IF;
  IF p_after_path IS NOT NULL AND NOT (p_after_path = ANY(v_paths)) THEN RAISE EXCEPTION 'invalid_after_photo'; END IF;
  FOREACH v_path IN ARRAY v_paths LOOP
    IF v_path NOT LIKE v_uid::text || '/%' OR v_path LIKE '%..%' THEN RAISE EXCEPTION 'photo_not_owned'; END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'portfolio-submissions' AND o.name = v_path
                   AND coalesce(o.metadata->>'mimetype', '') IN ('image/jpeg','image/png','image/webp')
                   AND coalesce((o.metadata->>'size')::bigint, 0) BETWEEN 1 AND 8388608) THEN
      RAISE EXCEPTION 'photo_missing_or_invalid';
    END IF;
  END LOOP;

  -- Serialize every free submission of this account (concurrency + duplicates).
  PERFORM pg_advisory_xact_lock(hashtext('portfolio_free_user:' || v_uid::text));

  SELECT count(*) INTO v_recent FROM public.contractor_portfolio_projects
    WHERE submitted_by = v_uid AND created_at > now() - interval '1 hour';
  IF v_recent >= 5 THEN RAISE EXCEPTION 'rate_limited'; END IF;

  SELECT id INTO v_contractor FROM public.contractors WHERE user_id = v_uid ORDER BY created_at LIMIT 1;
  IF v_contractor IS NULL THEN
    IF length(v_name) < 2 OR length(v_name) > 120 THEN RAISE EXCEPTION 'business_name_required'; END IF;
    IF v_email IS NULL AND v_phone IS NULL THEN RAISE EXCEPTION 'business_contact_required'; END IF;
    IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
    INSERT INTO public.contractors(user_id, business_name, email, phone, city)
      VALUES (v_uid, v_name, v_email, v_phone, v_city)
      RETURNING id INTO v_contractor;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('portfolio_free_contractor:' || v_contractor::text));

  SELECT count(*) INTO v_used FROM public.contractor_portfolio_projects
    WHERE contractor_id = v_contractor AND is_free_tier AND status IN ('pending','approved');
  SELECT count(*) INTO v_user_used FROM public.contractor_portfolio_projects
    WHERE submitted_by = v_uid AND is_free_tier AND status IN ('pending','approved');
  IF v_used >= 10 OR v_user_used >= 10 THEN RAISE EXCEPTION 'free_limit_reached'; END IF;

  INSERT INTO public.contractor_portfolio_projects(
    contractor_id, title, description, city, service_name, before_image_url, after_image_url, gallery_urls,
    status, submitted_by, photo_rights_confirmed, display_consent_at, show_company_name, client_request_id)
  VALUES (v_contractor, v_title, v_desc, v_city, v_service, p_before_path, p_after_path, to_jsonb(v_paths),
    'pending', v_uid, true, now(), coalesce(p_show_company_name, true), p_client_request_id)
  RETURNING id INTO v_id;

  INSERT INTO public.contractor_funnel_events(event_type, event_source, user_id, contractor_id, step, metadata, dedupe_key)
  SELECT 'project_submitted', 'app', v_uid, v_contractor, 'free_portfolio',
         jsonb_build_object('project_id', v_id, 'photos', array_length(v_paths, 1), 'free_tier', true),
         'portfolio_submitted:' || v_id::text
  WHERE NOT EXISTS (SELECT 1 FROM public.contractor_funnel_events WHERE dedupe_key = 'portfolio_submitted:' || v_id::text);

  INSERT INTO public.admin_notifications(type, severity, contractor_id, title, body, payload_json)
  VALUES ('portfolio_project_pending', 'info', v_contractor, 'Réalisation à modérer',
          left(v_service || ' — ' || v_city, 160), jsonb_build_object('project_id', v_id));

  RETURN jsonb_build_object('result', 'created', 'id', v_id, 'status', 'pending', 'used', v_used + 1, 'limit', 10);
END; $$;
REVOKE ALL ON FUNCTION public.submit_portfolio_project(uuid, text, text, text, text, text, text, text, text[], text, text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_portfolio_project(uuid, text, text, text, text, text, text, text, text[], text, text, boolean, boolean) TO authenticated, service_role;

-- Owner withdrawal ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_portfolio_project(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501'; END IF;
  SELECT p.status INTO v_status FROM public.contractor_portfolio_projects p
    WHERE p.id = p_id AND public.owns_contractor(p.contractor_id) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501'; END IF;
  IF v_status = 'withdrawn' THEN RETURN jsonb_build_object('result', 'already_withdrawn'); END IF;
  UPDATE public.contractor_portfolio_projects SET status = 'withdrawn', withdrawn_at = now(), updated_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('result', 'withdrawn');
END; $$;
REVOKE ALL ON FUNCTION public.withdraw_portfolio_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_portfolio_project(uuid) TO authenticated, service_role;

-- Admin moderation ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_portfolio_project(p_id uuid, p_decision text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row record; v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approve','reject') THEN RAISE EXCEPTION 'invalid_decision'; END IF;
  SELECT id, status, contractor_id INTO v_row FROM public.contractor_portfolio_projects WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_row.status = 'withdrawn' THEN RAISE EXCEPTION 'withdrawn_by_owner'; END IF;
  IF p_decision = 'approve' THEN
    IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'not_pending'; END IF;
    UPDATE public.contractor_portfolio_projects
      SET status = 'approved', published_at = now(), reviewed_by = auth.uid(), reviewed_at = now(),
          review_reason = v_reason, updated_at = now()
      WHERE id = p_id;
    INSERT INTO public.contractor_funnel_events(event_type, event_source, user_id, contractor_id, step, metadata, dedupe_key)
    SELECT 'project_approved', 'app', auth.uid(), v_row.contractor_id, 'free_portfolio',
           jsonb_build_object('project_id', p_id), 'portfolio_approved:' || p_id::text
    WHERE NOT EXISTS (SELECT 1 FROM public.contractor_funnel_events WHERE dedupe_key = 'portfolio_approved:' || p_id::text);
  ELSE
    IF v_reason IS NULL OR length(v_reason) < 5 THEN RAISE EXCEPTION 'reason_required'; END IF;
    UPDATE public.contractor_portfolio_projects
      SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_reason = v_reason, updated_at = now()
      WHERE id = p_id;
  END IF;
  RETURN jsonb_build_object('result', p_decision);
END; $$;
REVOKE ALL ON FUNCTION public.moderate_portfolio_project(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_portfolio_project(uuid, text, text) TO authenticated, service_role;

-- Public feed: exactly the 10 most recent approved projects, safe columns only.
CREATE OR REPLACE FUNCTION public.public_portfolio_feed()
RETURNS TABLE(id uuid, title text, service_name text, city text, description text, photo_paths text[],
              before_path text, after_path text, company_name text, author_verified boolean, published_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.service_name, p.city, p.description,
         ARRAY(SELECT jsonb_array_elements_text(p.gallery_urls)),
         p.before_image_url, p.after_image_url,
         CASE WHEN p.show_company_name THEN c.business_name END,
         coalesce(c.public_status = 'verified_active', false),
         p.published_at
  FROM public.contractor_portfolio_projects p
  JOIN public.contractors c ON c.id = p.contractor_id
  WHERE p.status = 'approved' AND p.published_at IS NOT NULL
  ORDER BY p.published_at DESC, p.id
  LIMIT 10;
$$;
REVOKE ALL ON FUNCTION public.public_portfolio_feed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_portfolio_feed() TO anon, authenticated, service_role;