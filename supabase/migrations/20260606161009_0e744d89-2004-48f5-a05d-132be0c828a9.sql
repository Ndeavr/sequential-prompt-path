
-- 1. activation_pipeline_runs: hide Stripe IDs from anon
REVOKE SELECT (stripe_payment_intent_id, stripe_session_id) ON public.activation_pipeline_runs FROM anon;

-- 2. aipp_profiles: hide phone/email from anon
REVOKE SELECT (phone, email) ON public.aipp_profiles FROM anon;

-- 3. contractors_prospects: hide PII/SMS columns from anon
REVOKE SELECT (phone, email, sms_reply_text, verified_email, sms_message_sid, emails_found, enrichment_log)
  ON public.contractors_prospects FROM anon;

-- 4. contractor_import_assets: remove permissive public policies, restrict to admins
DROP POLICY IF EXISTS import_assets_read_all   ON public.contractor_import_assets;
DROP POLICY IF EXISTS import_assets_write_all  ON public.contractor_import_assets;
DROP POLICY IF EXISTS import_assets_update_all ON public.contractor_import_assets;
REVOKE ALL ON public.contractor_import_assets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_import_assets TO authenticated;
GRANT ALL ON public.contractor_import_assets TO service_role;
CREATE POLICY "Admins manage import assets" ON public.contractor_import_assets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. contractor_import_runs: remove permissive public policies, restrict to owner/admin
DROP POLICY IF EXISTS import_runs_read_all   ON public.contractor_import_runs;
DROP POLICY IF EXISTS import_runs_insert_all ON public.contractor_import_runs;
DROP POLICY IF EXISTS import_runs_update_all ON public.contractor_import_runs;
REVOKE ALL ON public.contractor_import_runs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_import_runs TO authenticated;
GRANT ALL ON public.contractor_import_runs TO service_role;
CREATE POLICY "Owners read their import runs" ON public.contractor_import_runs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners insert their import runs" ON public.contractor_import_runs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners update their import runs" ON public.contractor_import_runs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete import runs" ON public.contractor_import_runs
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. email_test_runs: remove overly broad authenticated policy
DROP POLICY IF EXISTS admin_full_access_email_test_runs ON public.email_test_runs;
