
-- Fix contractors_prospects.assigned_affiliate_id FK: point to affiliates(id), not auth.users(id)
ALTER TABLE public.contractors_prospects
  DROP CONSTRAINT IF EXISTS contractors_prospects_assigned_affiliate_id_fkey;

-- Clear any orphan values that don't exist in affiliates
UPDATE public.contractors_prospects
   SET assigned_affiliate_id = NULL
 WHERE assigned_affiliate_id IS NOT NULL
   AND assigned_affiliate_id NOT IN (SELECT id FROM public.affiliates);

ALTER TABLE public.contractors_prospects
  ADD CONSTRAINT contractors_prospects_assigned_affiliate_id_fkey
  FOREIGN KEY (assigned_affiliate_id)
  REFERENCES public.affiliates(id)
  ON DELETE SET NULL;
