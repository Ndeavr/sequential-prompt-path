-- Persist affiliate prospect-list access fix (production-applied)
-- No business logic or data changes; only grants and policy recreation.

-- 1. Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.manual_queue_for_me() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_affiliate_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_affiliate(uuid) TO authenticated;

-- 2. Recreate affiliate prospect access policies on contractors_prospects
DROP POLICY IF EXISTS "affiliate_read_assigned_prospects" ON public.contractors_prospects;
CREATE POLICY "affiliate_read_assigned_prospects"
  ON public.contractors_prospects
  FOR SELECT
  TO authenticated
  USING (public.is_affiliate_owner(assigned_affiliate_id));

DROP POLICY IF EXISTS "affiliate_update_assigned_prospects" ON public.contractors_prospects;
CREATE POLICY "affiliate_update_assigned_prospects"
  ON public.contractors_prospects
  FOR UPDATE
  TO authenticated
  USING (public.is_affiliate_owner(assigned_affiliate_id))
  WITH CHECK (public.is_affiliate_owner(assigned_affiliate_id));