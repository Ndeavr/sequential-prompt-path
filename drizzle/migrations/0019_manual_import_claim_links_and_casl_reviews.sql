CREATE TABLE public.manual_import_claim_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_row_id uuid NOT NULL REFERENCES public.acquisition_manual_import_rows(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_reason text,
  opened_count integer NOT NULL DEFAULT 0,
  last_opened_at timestamptz,
  claim_user_id uuid,
  claim_requested_at timestamptz,
  claim_status text NOT NULL DEFAULT 'none' CHECK (claim_status IN ('none','pending_verification','verified','rejected')),
  claim_attempts integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX manual_import_claim_links_one_active ON public.manual_import_claim_links(import_row_id) WHERE revoked_at IS NULL;
GRANT SELECT ON public.manual_import_claim_links TO authenticated;
GRANT ALL ON public.manual_import_claim_links TO service_role;
ALTER TABLE public.manual_import_claim_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read claim links" ON public.manual_import_claim_links FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.manual_import_casl_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_row_id uuid NOT NULL REFERENCES public.acquisition_manual_import_rows(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('evidence_documented','refusal_found','insufficient_evidence')),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  evidence_date date NOT NULL,
  reason text NOT NULL CHECK (length(reason) >= 10),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.manual_import_casl_reviews TO authenticated;
GRANT ALL ON public.manual_import_casl_reviews TO service_role;
ALTER TABLE public.manual_import_casl_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read casl reviews" ON public.manual_import_casl_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins sign casl reviews" ON public.manual_import_casl_reviews FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND reviewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.manual_import_casl_reviews_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'manual_import_casl_reviews is append-only'; END $$;
CREATE TRIGGER trg_manual_import_casl_reviews_immutable BEFORE UPDATE OR DELETE ON public.manual_import_casl_reviews
FOR EACH ROW EXECUTE FUNCTION public.manual_import_casl_reviews_immutable();