-- Run in an ISOLATED copy AFTER applying 20261030_rls_batch1_private_reads.sql, inside BEGIN … ROLLBACK.
-- Each block raises on failure. Replace :admin_uid / :user_uid with synthetic users (admin has user_roles.role='admin').
BEGIN;

-- anon: cannot read any of the 3 tables
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.owner_match_photos) <> 0 THEN RAISE EXCEPTION 'anon reads photos'; END IF;
  IF (SELECT count(*) FROM public.homeowner_project_diagnoses) <> 0 THEN RAISE EXCEPTION 'anon reads diagnoses'; END IF;
  IF (SELECT count(*) FROM public.lead_capture_sessions) <> 0 THEN RAISE EXCEPTION 'anon reads lead sessions'; END IF;
END $$;
-- anon: valid lead session insert succeeds (positive), without RETURNING
INSERT INTO public.lead_capture_sessions (id, source_channel, device_type, status)
  VALUES ('00000000-0000-4000-8000-0000000000a1', 'qa', 'mobile', 'started');
-- anon: out-of-bounds insert rejected (negative)
DO $$ BEGIN
  BEGIN INSERT INTO public.lead_capture_sessions (source_channel, device_type, status) VALUES ('qa','tv','converted');
    RAISE EXCEPTION 'bad lead insert accepted';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
  BEGIN INSERT INTO public.owner_match_photos (storage_path) VALUES ('x'); RAISE EXCEPTION 'anon photo insert accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.homeowner_project_diagnoses (detected_city) VALUES ('x'); RAISE EXCEPTION 'anon diagnosis insert accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- non-admin authenticated: no reads (cross-account)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'user_uid', 'role', 'authenticated')::text, true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.lead_capture_sessions) <> 0 THEN RAISE EXCEPTION 'user reads lead sessions'; END IF;
  IF (SELECT count(*) FROM public.role_permissions) = 0 THEN RAISE EXCEPTION 'role_permissions catalog no longer readable'; END IF;
END $$;
-- admin: reads the synthetic row (positive)
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_uid', 'role', 'authenticated')::text, true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.lead_capture_sessions WHERE id = '00000000-0000-4000-8000-0000000000a1') <> 1 THEN RAISE EXCEPTION 'admin cannot read'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
