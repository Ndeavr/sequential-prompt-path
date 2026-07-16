
-- 1. affiliates: extra columns + expanded status
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS province TEXT DEFAULT 'QC',
  ADD COLUMN IF NOT EXISTS territories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_assigned INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_contacted INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_trials INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_converted INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_commissions_cents INT NOT NULL DEFAULT 0;

-- Expand status check
ALTER TABLE public.affiliates DROP CONSTRAINT IF EXISTS affiliates_status_check;
ALTER TABLE public.affiliates
  ADD CONSTRAINT affiliates_status_check
  CHECK (status = ANY (ARRAY['pending','active','inactive','suspended','training','admin']));

-- 2. affiliate_applications
CREATE TABLE IF NOT EXISTS public.affiliate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  province TEXT DEFAULT 'QC',
  experience TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_applications TO authenticated;
GRANT INSERT ON public.affiliate_applications TO anon;
GRANT ALL ON public.affiliate_applications TO service_role;
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit applications" ON public.affiliate_applications;
CREATE POLICY "Public can submit applications" ON public.affiliate_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage applications" ON public.affiliate_applications;
CREATE POLICY "Admins manage applications" ON public.affiliate_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. commissions
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  contractor_id UUID,
  lead_id UUID,
  plan TEXT,
  sale_cents INT NOT NULL DEFAULT 0,
  commission_cents INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','void')),
  paid_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON public.commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates see own commissions" ON public.commissions;
CREATE POLICY "Affiliates see own commissions" ON public.commissions
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins manage commissions" ON public.commissions;
CREATE POLICY "Admins manage commissions" ON public.commissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_affiliate_applications_updated ON public.affiliate_applications;
CREATE TRIGGER trg_affiliate_applications_updated BEFORE UPDATE ON public.affiliate_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_commissions_updated ON public.commissions;
CREATE TRIGGER trg_commissions_updated BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
