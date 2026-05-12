-- 1. contractor_import_sessions: scope SELECT/UPDATE to owner or admin
DROP POLICY IF EXISTS "Users can view own import sessions" ON public.contractor_import_sessions;
CREATE POLICY "Users can view own import sessions"
  ON public.contractor_import_sessions FOR SELECT
  USING (
    initiated_by_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Users can update own import sessions" ON public.contractor_import_sessions;
CREATE POLICY "Users can update own import sessions"
  ON public.contractor_import_sessions FOR UPDATE
  USING (
    initiated_by_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    initiated_by_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 2. audit_intake_sessions: restrict SELECT/UPDATE to admins
DROP POLICY IF EXISTS "Anyone can read own intake session by token" ON public.audit_intake_sessions;
CREATE POLICY "Admins can read intake sessions"
  ON public.audit_intake_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone can update intake sessions" ON public.audit_intake_sessions;
CREATE POLICY "Admins can update intake sessions"
  ON public.audit_intake_sessions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. condo_waitlist_leads: SELECT admin-only
DROP POLICY IF EXISTS "Admins can view waitlist" ON public.condo_waitlist_leads;
CREATE POLICY "Admins can view waitlist"
  ON public.condo_waitlist_leads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. alex_homeowner_recovery_queue: SELECT admin-only
DROP POLICY IF EXISTS "Read homeowner recovery queue" ON public.alex_homeowner_recovery_queue;
CREATE POLICY "Admins read homeowner recovery queue"
  ON public.alex_homeowner_recovery_queue FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. contractor_import_followups: scope to import session owner or admin
DROP POLICY IF EXISTS "Anyone can manage followups" ON public.contractor_import_followups;

CREATE POLICY "Owners read followups"
  ON public.contractor_import_followups FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.contractor_import_sessions s
      WHERE s.id = contractor_import_followups.import_session_id
        AND s.initiated_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners insert followups"
  ON public.contractor_import_followups FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.contractor_import_sessions s
      WHERE s.id = contractor_import_followups.import_session_id
        AND s.initiated_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners update followups"
  ON public.contractor_import_followups FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.contractor_import_sessions s
      WHERE s.id = contractor_import_followups.import_session_id
        AND s.initiated_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners delete followups"
  ON public.contractor_import_followups FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.contractor_import_sessions s
      WHERE s.id = contractor_import_followups.import_session_id
        AND s.initiated_by_user_id = auth.uid()
    )
  );

-- 6. profile_missing_fields: scope to contractor owner or admin
DROP POLICY IF EXISTS "Users manage own missing fields" ON public.profile_missing_fields;

CREATE POLICY "Contractor owner reads missing fields"
  ON public.profile_missing_fields FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = profile_missing_fields.contractor_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Contractor owner inserts missing fields"
  ON public.profile_missing_fields FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = profile_missing_fields.contractor_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Contractor owner updates missing fields"
  ON public.profile_missing_fields FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = profile_missing_fields.contractor_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Contractor owner deletes missing fields"
  ON public.profile_missing_fields FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = profile_missing_fields.contractor_id
        AND c.user_id = auth.uid()
    )
  );

-- 7. business-assets storage: enforce folder ownership on SELECT and DELETE
DROP POLICY IF EXISTS "Auth users read own business assets" ON storage.objects;
CREATE POLICY "Auth users read own business assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Auth users delete own business assets" ON storage.objects;
CREATE POLICY "Auth users delete own business assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Auth users upload business assets" ON storage.objects;
CREATE POLICY "Auth users upload business assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );