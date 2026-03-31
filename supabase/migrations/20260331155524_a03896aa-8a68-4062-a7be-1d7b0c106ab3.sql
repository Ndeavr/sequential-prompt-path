
-- Drop the broken policy
DROP POLICY IF EXISTS "anyone_can_insert_leads" ON public.entrepreneur_leads;

-- Recreate for both anon and authenticated
CREATE POLICY "anyone_can_insert_leads" ON public.entrepreneur_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
