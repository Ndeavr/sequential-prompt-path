
-- Make uploaded_by_user_id nullable for guest imports
ALTER TABLE public.business_card_imports ALTER COLUMN uploaded_by_user_id DROP NOT NULL;

-- Make created_by nullable for guest imports  
ALTER TABLE public.contractor_leads ALTER COLUMN created_by DROP NOT NULL;

-- Add anon-friendly policies for service-role operations
-- The edge function uses service_role so it bypasses RLS, 
-- but we need anon SELECT for the client to read results

-- Allow anon to read leads they just created (via lead_id stored client-side)
CREATE POLICY "Anon can read leads by id" ON public.contractor_leads
  FOR SELECT TO anon
  USING (true);

-- Allow anon to read imports by id
CREATE POLICY "Anon can read imports" ON public.business_card_imports
  FOR SELECT TO anon
  USING (true);

-- Allow anon to read extractions
CREATE POLICY "Anon can read extractions" ON public.business_card_extractions
  FOR SELECT TO anon
  USING (true);
