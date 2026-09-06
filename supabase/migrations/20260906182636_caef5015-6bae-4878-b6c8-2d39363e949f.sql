-- Revert to project rule: public views stay SECURITY INVOKER.
ALTER VIEW public.v_sms_sprint_landing SET (security_invoker = true);

-- Least privilege on the base table: drop the blanket anon/authenticated ACL and
-- re-grant SELECT only on the columns the public activation landing needs.
REVOKE ALL ON public.sms_sprint_prospects FROM anon, authenticated;

GRANT SELECT (tracking_slug, company_name, city, category, variant, activation_status)
  ON public.sms_sprint_prospects TO anon, authenticated;

GRANT ALL ON public.sms_sprint_prospects TO service_role;

-- Row access: only prospects that actually carry an activation link are readable.
DROP POLICY IF EXISTS "Public can read sprint landing rows" ON public.sms_sprint_prospects;
CREATE POLICY "Public can read sprint landing rows"
  ON public.sms_sprint_prospects
  FOR SELECT
  TO anon, authenticated
  USING (tracking_slug IS NOT NULL);