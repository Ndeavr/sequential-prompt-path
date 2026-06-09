
-- 1. contractor_intel_snapshots
CREATE TABLE public.contractor_intel_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  source text NOT NULL DEFAULT 'firecrawl',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_notes text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, source)
);
CREATE INDEX contractor_intel_snapshots_slug_idx ON public.contractor_intel_snapshots(slug);

GRANT SELECT ON public.contractor_intel_snapshots TO anon, authenticated;
GRANT ALL ON public.contractor_intel_snapshots TO service_role;

ALTER TABLE public.contractor_intel_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intel snapshots public read"
  ON public.contractor_intel_snapshots
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "intel snapshots admin update"
  ON public.contractor_intel_snapshots
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. contractor_evaluation_requests
CREATE TABLE public.contractor_evaluation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_slug text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  preferred_slot text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'public_profile',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contractor_evaluation_requests_slug_idx
  ON public.contractor_evaluation_requests(contractor_slug, created_at DESC);

GRANT INSERT ON public.contractor_evaluation_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contractor_evaluation_requests TO authenticated;
GRANT ALL ON public.contractor_evaluation_requests TO service_role;

ALTER TABLE public.contractor_evaluation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluation requests open insert"
  ON public.contractor_evaluation_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "evaluation requests admin read"
  ON public.contractor_evaluation_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "evaluation requests admin update"
  ON public.contractor_evaluation_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_contractor_intel_snapshots_updated
  BEFORE UPDATE ON public.contractor_intel_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_contractor_evaluation_requests_updated
  BEFORE UPDATE ON public.contractor_evaluation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
