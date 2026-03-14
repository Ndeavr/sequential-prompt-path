
-- Listing imports table
CREATE TABLE public.listing_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  submitted_by UUID NOT NULL,
  source_url TEXT NOT NULL,
  source_platform TEXT,
  import_status TEXT NOT NULL DEFAULT 'pending',
  raw_html TEXT,
  extracted_data JSONB DEFAULT '{}',
  mapped_fields JSONB DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own listing imports"
  ON public.listing_imports FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own listing imports"
  ON public.listing_imports FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can update own listing imports"
  ON public.listing_imports FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Certification reviews table
CREATE TABLE public.certification_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  certification_status TEXT NOT NULL DEFAULT 'not_eligible',
  passport_completion_pct NUMERIC DEFAULT 0,
  document_quality_score NUMERIC DEFAULT 0,
  data_confidence_score NUMERIC DEFAULT 0,
  contribution_count INTEGER DEFAULT 0,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_cert_status CHECK (certification_status IN ('not_eligible', 'eligible', 'in_review', 'certified', 'expired'))
);

ALTER TABLE public.certification_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own certification"
  ON public.certification_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.user_id = auth.uid() OR p.claimed_by = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin can manage certifications"
  ON public.certification_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add certification_status to properties for quick lookup
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS certification_status TEXT DEFAULT 'not_eligible';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_import_id UUID REFERENCES public.listing_imports(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_listing_imports_property ON public.listing_imports(property_id);
CREATE INDEX IF NOT EXISTS idx_listing_imports_submitted_by ON public.listing_imports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_certification_reviews_property ON public.certification_reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_certification_reviews_status ON public.certification_reviews(certification_status);
