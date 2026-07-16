
-- Add affiliate manual-lead columns to contractor_leads
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS created_by_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consent_channel text,
  ADD COLUMN IF NOT EXISTS consent_to_contact text,
  ADD COLUMN IF NOT EXISTS business_card_url text,
  ADD COLUMN IF NOT EXISTS extraction_raw jsonb,
  ADD COLUMN IF NOT EXISTS extraction_confidence jsonb;

-- Dedupe indexes
CREATE INDEX IF NOT EXISTS idx_contractor_leads_phone_e164 ON public.contractor_leads (phone_e164);
CREATE INDEX IF NOT EXISTS idx_contractor_leads_email_lower ON public.contractor_leads (lower(email));
CREATE INDEX IF NOT EXISTS idx_contractor_leads_created_by_affiliate ON public.contractor_leads (created_by_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_contractor_leads_assigned_affiliate ON public.contractor_leads (assigned_affiliate_id);

-- Helper: is current user an affiliate that owns this row
CREATE OR REPLACE FUNCTION public.is_affiliate_owner(_affiliate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.id = _affiliate_id AND a.user_id = auth.uid()
  );
$$;

-- RLS policies for affiliate access on contractor_leads
DROP POLICY IF EXISTS "Affiliates can insert their own leads" ON public.contractor_leads;
CREATE POLICY "Affiliates can insert their own leads"
  ON public.contractor_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_affiliate_owner(created_by_affiliate_id));

DROP POLICY IF EXISTS "Affiliates can read their own leads" ON public.contractor_leads;
CREATE POLICY "Affiliates can read their own leads"
  ON public.contractor_leads
  FOR SELECT
  TO authenticated
  USING (
    public.is_affiliate_owner(created_by_affiliate_id)
    OR public.is_affiliate_owner(assigned_affiliate_id)
  );

DROP POLICY IF EXISTS "Affiliates can update their own leads" ON public.contractor_leads;
CREATE POLICY "Affiliates can update their own leads"
  ON public.contractor_leads
  FOR UPDATE
  TO authenticated
  USING (
    public.is_affiliate_owner(created_by_affiliate_id)
    OR public.is_affiliate_owner(assigned_affiliate_id)
  )
  WITH CHECK (
    public.is_affiliate_owner(created_by_affiliate_id)
    OR public.is_affiliate_owner(assigned_affiliate_id)
  );
