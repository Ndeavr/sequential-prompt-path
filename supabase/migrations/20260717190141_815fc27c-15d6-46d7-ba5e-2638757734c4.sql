DELETE FROM public.affiliate_assignments a
WHERE NOT EXISTS (SELECT 1 FROM public.affiliates af WHERE af.id = a.affiliate_id);

ALTER TABLE public.affiliate_assignments
  DROP CONSTRAINT IF EXISTS affiliate_assignments_affiliate_id_fkey;

ALTER TABLE public.affiliate_assignments
  ADD CONSTRAINT affiliate_assignments_affiliate_id_fkey
  FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "affiliate_read_own_assignments" ON public.affiliate_assignments;
CREATE POLICY "affiliate_read_own_assignments" ON public.affiliate_assignments
  FOR SELECT TO authenticated
  USING (public.is_affiliate_owner(affiliate_id));

DROP POLICY IF EXISTS "affiliate_update_own_assignments" ON public.affiliate_assignments;
CREATE POLICY "affiliate_update_own_assignments" ON public.affiliate_assignments
  FOR UPDATE TO authenticated
  USING (public.is_affiliate_owner(affiliate_id))
  WITH CHECK (public.is_affiliate_owner(affiliate_id));

CREATE OR REPLACE FUNCTION public.get_launch_lead_status_counts()
RETURNS TABLE(lead_status text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lead_status::text, COUNT(*)::bigint
  FROM public.launch_leads
  GROUP BY lead_status;
$$;

GRANT EXECUTE ON FUNCTION public.get_launch_lead_status_counts() TO service_role;