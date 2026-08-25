DROP POLICY IF EXISTS "Affiliates read own recommendation audits" ON public.ai_recommendation_audits;
CREATE POLICY "Affiliates read own recommendation audits"
  ON public.ai_recommendation_audits
  FOR SELECT
  TO authenticated
  USING (affiliate_id IS NOT NULL AND public.is_affiliate_owner(affiliate_id));