
-- =============================================
-- MODULE 1: DataExtractionEngineCityDomain
-- =============================================

-- 1. Service Domains (trade categories)
CREATE TABLE IF NOT EXISTS public.service_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category_parent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage service_domains" ON public.service_domains FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read service_domains" ON public.service_domains FOR SELECT USING (true);

-- 2. Source Connectors
CREATE TABLE IF NOT EXISTS public.source_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  source_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.source_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage source_connectors" ON public.source_connectors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Companies (identity-resolved)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text,
  display_name text,
  neq_number text,
  rbq_number text,
  website text,
  primary_email text,
  primary_phone text,
  address_line_1 text,
  city_id uuid REFERENCES public.cities(id),
  postal_code text,
  domain_id uuid REFERENCES public.service_domains(id),
  status text NOT NULL DEFAULT 'pending_extraction',
  verification_status text NOT NULL DEFAULT 'pending',
  merged_into_company_id uuid REFERENCES public.companies(id),
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_companies_status ON public.companies(status);
CREATE INDEX idx_companies_city_id ON public.companies(city_id);
CREATE INDEX idx_companies_domain_id ON public.companies(domain_id);
CREATE INDEX idx_companies_neq ON public.companies(neq_number) WHERE neq_number IS NOT NULL;
CREATE INDEX idx_companies_rbq ON public.companies(rbq_number) WHERE rbq_number IS NOT NULL;
CREATE INDEX idx_companies_verification ON public.companies(verification_status);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage companies" ON public.companies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Company Raw Records
CREATE TABLE IF NOT EXISTS public.company_raw_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_connector_id uuid NOT NULL REFERENCES public.source_connectors(id),
  external_id text,
  raw_payload_json jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  city_guess text,
  domain_guess text,
  company_name_raw text,
  website_raw text,
  phone_raw text,
  email_raw text,
  status text NOT NULL DEFAULT 'pending',
  company_id uuid REFERENCES public.companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_raw_source ON public.company_raw_records(source_connector_id);
CREATE INDEX idx_company_raw_status ON public.company_raw_records(status);
CREATE INDEX idx_company_raw_company ON public.company_raw_records(company_id) WHERE company_id IS NOT NULL;
ALTER TABLE public.company_raw_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage company_raw_records" ON public.company_raw_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Company Aliases
CREATE TABLE IF NOT EXISTS public.company_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alias_name text NOT NULL,
  alias_type text NOT NULL DEFAULT 'other',
  source_connector_id uuid REFERENCES public.source_connectors(id),
  confidence_score numeric DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_aliases_company ON public.company_aliases(company_id);
ALTER TABLE public.company_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage company_aliases" ON public.company_aliases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Company Source Fields (per-field confidence tracking)
CREATE TABLE IF NOT EXISTS public.company_source_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_value_text text,
  source_connector_id uuid REFERENCES public.source_connectors(id),
  confidence_score numeric DEFAULT 0.5,
  is_selected boolean NOT NULL DEFAULT false,
  extracted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_csf_company ON public.company_source_fields(company_id);
CREATE INDEX idx_csf_field ON public.company_source_fields(company_id, field_name);
ALTER TABLE public.company_source_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage company_source_fields" ON public.company_source_fields FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Company City Domains (city × domain mapping)
CREATE TABLE IF NOT EXISTS public.company_city_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id),
  domain_id uuid NOT NULL REFERENCES public.service_domains(id),
  fit_score numeric DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ccd_company ON public.company_city_domains(company_id);
CREATE INDEX idx_ccd_city_domain ON public.company_city_domains(city_id, domain_id);
CREATE UNIQUE INDEX idx_ccd_unique ON public.company_city_domains(company_id, city_id, domain_id);
ALTER TABLE public.company_city_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage company_city_domains" ON public.company_city_domains FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Extraction Reviews
CREATE TABLE IF NOT EXISTS public.extraction_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  review_status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_extraction_reviews_company ON public.extraction_reviews(company_id);
CREATE INDEX idx_extraction_reviews_status ON public.extraction_reviews(review_status);
ALTER TABLE public.extraction_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage extraction_reviews" ON public.extraction_reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Extraction Audit Logs
CREATE TABLE IF NOT EXISTS public.extraction_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action_type text NOT NULL,
  before_json jsonb,
  after_json jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_eal_entity ON public.extraction_audit_logs(entity_type, entity_id);
CREATE INDEX idx_eal_created ON public.extraction_audit_logs(created_at DESC);
ALTER TABLE public.extraction_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage extraction_audit_logs" ON public.extraction_audit_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER set_service_domains_updated_at BEFORE UPDATE ON public.service_domains FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_source_connectors_updated_at BEFORE UPDATE ON public.source_connectors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPC: Approve a company
CREATE OR REPLACE FUNCTION public.approve_company(_company_id uuid, _actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.companies SET
    status = 'approved',
    verification_status = 'verified',
    approved_at = now(),
    approved_by = _actor_id
  WHERE id = _company_id AND status != 'approved';

  INSERT INTO public.extraction_reviews (company_id, review_status, reviewed_by, reviewed_at)
  VALUES (_company_id, 'approved', _actor_id, now());

  INSERT INTO public.extraction_audit_logs (entity_type, entity_id, action_type, actor_id)
  VALUES ('company', _company_id, 'approved', _actor_id);

  RETURN jsonb_build_object('ok', true, 'company_id', _company_id);
END;
$$;

-- RPC: Reject a company
CREATE OR REPLACE FUNCTION public.reject_company(_company_id uuid, _actor_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.companies SET status = 'rejected' WHERE id = _company_id;

  INSERT INTO public.extraction_reviews (company_id, review_status, review_notes, reviewed_by, reviewed_at)
  VALUES (_company_id, 'rejected', _notes, _actor_id, now());

  INSERT INTO public.extraction_audit_logs (entity_type, entity_id, action_type, actor_id)
  VALUES ('company', _company_id, 'rejected', _actor_id);

  RETURN jsonb_build_object('ok', true, 'company_id', _company_id);
END;
$$;

-- RPC: Merge companies
CREATE OR REPLACE FUNCTION public.merge_companies(_source_id uuid, _target_id uuid, _actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Move aliases
  UPDATE public.company_aliases SET company_id = _target_id WHERE company_id = _source_id;
  -- Move source fields
  UPDATE public.company_source_fields SET company_id = _target_id WHERE company_id = _source_id;
  -- Move city domains
  UPDATE public.company_city_domains SET company_id = _target_id WHERE company_id = _source_id
    AND NOT EXISTS (SELECT 1 FROM public.company_city_domains WHERE company_id = _target_id AND city_id = company_city_domains.city_id AND domain_id = company_city_domains.domain_id);
  -- Mark source as merged
  UPDATE public.companies SET status = 'merged', merged_into_company_id = _target_id WHERE id = _source_id;

  INSERT INTO public.extraction_audit_logs (entity_type, entity_id, action_type, after_json, actor_id)
  VALUES ('company', _source_id, 'merged_into', jsonb_build_object('target_id', _target_id), _actor_id);

  RETURN jsonb_build_object('ok', true, 'source_id', _source_id, 'target_id', _target_id);
END;
$$;
