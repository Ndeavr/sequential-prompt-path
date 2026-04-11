
-- Create contractor_leads table
CREATE TABLE public.contractor_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL DEFAULT 'business_card',
  source_label TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  company_name TEXT,
  role_title TEXT,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  website_url TEXT,
  street_address TEXT,
  city TEXT,
  province TEXT DEFAULT 'QC',
  postal_code TEXT,
  category_primary TEXT,
  category_secondary TEXT,
  language_primary TEXT DEFAULT 'fr',
  lead_status TEXT NOT NULL DEFAULT 'new',
  enrichment_status TEXT NOT NULL DEFAULT 'pending',
  outreach_status TEXT NOT NULL DEFAULT 'none',
  profile_status TEXT NOT NULL DEFAULT 'missing',
  score_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'none',
  activation_status TEXT NOT NULL DEFAULT 'not_started',
  assigned_admin_id UUID,
  created_by UUID,
  contractor_id UUID REFERENCES public.contractors(id),
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leads" ON public.contractor_leads
  FOR SELECT USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create leads" ON public.contractor_leads
  FOR INSERT WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own leads" ON public.contractor_leads
  FOR UPDATE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_contractor_leads_status ON public.contractor_leads(lead_status);
CREATE INDEX idx_contractor_leads_created_by ON public.contractor_leads(created_by);

CREATE TRIGGER set_contractor_leads_updated_at
  BEFORE UPDATE ON public.contractor_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create business_card_imports table
CREATE TABLE public.business_card_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID NOT NULL,
  image_front_url TEXT,
  image_back_url TEXT,
  import_status TEXT NOT NULL DEFAULT 'pending',
  extraction_confidence_global NUMERIC(5,2),
  raw_ocr_text TEXT,
  ai_model_used TEXT,
  processing_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_card_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own imports" ON public.business_card_imports
  FOR SELECT USING (auth.uid() = uploaded_by_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create imports" ON public.business_card_imports
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by_user_id);

CREATE POLICY "Users can update own imports" ON public.business_card_imports
  FOR UPDATE USING (auth.uid() = uploaded_by_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_bci_lead_id ON public.business_card_imports(lead_id);

CREATE TRIGGER set_bci_updated_at
  BEFORE UPDATE ON public.business_card_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create business_card_extractions table
CREATE TABLE public.business_card_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.business_card_imports(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  confidence_score NUMERIC(5,2),
  source_side TEXT DEFAULT 'front',
  is_verified BOOLEAN DEFAULT false,
  needs_manual_review BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_card_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view extractions via import" ON public.business_card_extractions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.business_card_imports bci
      WHERE bci.id = import_id AND (bci.uploaded_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "System can insert extractions" ON public.business_card_extractions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update extractions" ON public.business_card_extractions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.business_card_imports bci
      WHERE bci.id = import_id AND (bci.uploaded_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE INDEX idx_bce_import_id ON public.business_card_extractions(import_id);

-- Storage bucket for business card images
INSERT INTO storage.buckets (id, name, public) VALUES ('business-cards', 'business-cards', false);

CREATE POLICY "Auth users can upload cards" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'business-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users can view own cards" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-cards' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
