ALTER TABLE public.scout_captures
  ADD COLUMN IF NOT EXISTS signal_type text,
  ADD COLUMN IF NOT EXISTS fingerprint text,
  ADD COLUMN IF NOT EXISTS post_context text,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS uq_scout_captures_fingerprint ON public.scout_captures(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scout_captures_signal ON public.scout_captures(signal_type, review_status);

CREATE TABLE IF NOT EXISTS public.scout_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id uuid NOT NULL REFERENCES public.scout_captures(id) ON DELETE CASCADE,
  person_name text,
  company_name text NOT NULL,
  relation text NOT NULL CHECK (relation IN ('employee_declared','owner_declared','mentioned','candidate_manual')),
  status text NOT NULL DEFAULT 'inferred' CHECK (status IN ('inferred','pending','verified','rejected')),
  source text NOT NULL,
  evidence text,
  evidence_url text,
  public_phone text,
  public_email text,
  public_website text,
  city text,
  prospect_id uuid REFERENCES public.verified_contractor_prospects(id) ON DELETE SET NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.scout_entity_links IS 'Person<->company hypotheses from Scout captures. No licence field by design: an employer RBQ is never attributed to a person.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_entity_links TO authenticated;
GRANT ALL ON public.scout_entity_links TO service_role;
ALTER TABLE public.scout_entity_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage scout entity links" ON public.scout_entity_links;
CREATE POLICY "Admins manage scout entity links" ON public.scout_entity_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_scout_entity_links_capture_company ON public.scout_entity_links(capture_id, lower(company_name));
CREATE INDEX IF NOT EXISTS idx_scout_entity_links_status ON public.scout_entity_links(status);