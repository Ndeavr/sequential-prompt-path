
-- =========================================================
-- CALCULATOR SESSION + SIGNATURE REQUESTS
-- =========================================================

-- 1. Signature requests table
CREATE TABLE IF NOT EXISTS public.signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  phone text,
  email text NOT NULL,
  city text NOT NULL,
  category text NOT NULL,
  specialty text,
  website text,
  monthly_budget text,
  wants_exclusivity boolean DEFAULT false,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert
CREATE POLICY "sr_insert" ON public.signature_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admins can see all, contractors see own
CREATE POLICY "sr_select" ON public.signature_requests
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
  );

CREATE POLICY "sr_admin_manage" ON public.signature_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also allow anon insert for non-logged-in visitors
CREATE POLICY "sr_anon_insert" ON public.signature_requests
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON public.signature_requests(status);
