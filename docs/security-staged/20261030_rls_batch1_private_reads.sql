-- STAGED — NOT APPLIED. Lot 1 « lectures sensibles » (scan 2026-10-30).
-- Findings: owner_match_photos (…1d1dd0213716cf18), homeowner_project_diagnoses (…1aba5c040dca0207),
--           lead_capture_sessions (…6459b77005c46741). role_permissions (…10f958ff27a8b6b1): NO CHANGE (see report).
-- Prerequisite: frontend change in PageAdLandingAipp.tsx (client-generated id, no insert-returning) must be published FIRST.

-- 1) owner_match_photos — 0 rows, no client/edge caller, no owner column (only session_id).
DROP POLICY IF EXISTS "Anyone can read match photos" ON public.owner_match_photos;
DROP POLICY IF EXISTS "Anyone can insert match photos" ON public.owner_match_photos;
REVOKE ALL ON public.owner_match_photos FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.owner_match_photos FROM authenticated;
GRANT SELECT ON public.owner_match_photos TO authenticated;
GRANT ALL ON public.owner_match_photos TO service_role;
CREATE POLICY "Admins read match photos" ON public.owner_match_photos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) homeowner_project_diagnoses — 0 rows; written/read only by edge alex-homeowner-process-turn
--    (service role, bypasses RLS); read client-side only by AdminHomeownerAnalyticsPage.
DROP POLICY IF EXISTS "Read homeowner diagnoses" ON public.homeowner_project_diagnoses;
DROP POLICY IF EXISTS "Insert homeowner diagnoses" ON public.homeowner_project_diagnoses;
REVOKE ALL ON public.homeowner_project_diagnoses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.homeowner_project_diagnoses FROM authenticated;
GRANT SELECT ON public.homeowner_project_diagnoses TO authenticated;
GRANT ALL ON public.homeowner_project_diagnoses TO service_role;
CREATE POLICY "Admins read homeowner diagnoses" ON public.homeowner_project_diagnoses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) lead_capture_sessions — anonymous ad landing keeps inserting (bounded), nobody but admins reads.
DROP POLICY IF EXISTS "Anyone can read own session" ON public.lead_capture_sessions;
DROP POLICY IF EXISTS "Anyone can insert lead sessions" ON public.lead_capture_sessions;
REVOKE ALL ON public.lead_capture_sessions FROM anon, authenticated;
GRANT INSERT ON public.lead_capture_sessions TO anon, authenticated;
GRANT SELECT ON public.lead_capture_sessions TO authenticated;
GRANT ALL ON public.lead_capture_sessions TO service_role;
CREATE POLICY "Visitors insert bounded lead sessions" ON public.lead_capture_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'started'
    AND device_type IN ('mobile', 'desktop')
    AND char_length(coalesce(source_channel, '')) <= 120
    AND char_length(coalesce(campaign_name, '')) <= 200
    AND char_length(coalesce(landing_variant, '')) <= 60
  );
CREATE POLICY "Admins read lead sessions" ON public.lead_capture_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
