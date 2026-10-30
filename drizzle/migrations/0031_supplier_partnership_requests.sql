CREATE TABLE public.supplier_partnership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  org_type text NOT NULL CHECK (org_type IN ('manufacturer','distributor','supplier','association','other')),
  network_size text,
  message text,
  privacy_consent boolean NOT NULL DEFAULT false,
  consent_text text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'partenariats-fournisseurs',
  locale text,
  ip_hash text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','declined','archived')),
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.supplier_partnership_requests TO authenticated;
GRANT ALL ON public.supplier_partnership_requests TO service_role;
ALTER TABLE public.supplier_partnership_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read supplier partnership requests" ON public.supplier_partnership_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update supplier partnership requests" ON public.supplier_partnership_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX supplier_partnership_requests_ip_recent ON public.supplier_partnership_requests (ip_hash, created_at DESC);