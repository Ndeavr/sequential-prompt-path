
-- ============================================================
-- Phase 1: Contractor Onboarding AIPP Activation Funnel
-- ============================================================

-- 1. Add status columns to contractors
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS activation_status text NOT NULL DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS recommended_plan_id text;

-- 2. contractor_profiles
CREATE TABLE IF NOT EXISTS public.contractor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  business_name text,
  legal_name text,
  public_slug text UNIQUE,
  short_description text,
  long_description text,
  primary_category text,
  secondary_categories jsonb DEFAULT '[]'::jsonb,
  years_in_business integer,
  founded_year integer,
  languages jsonb DEFAULT '["fr"]'::jsonb,
  emergency_service_flag boolean DEFAULT false,
  financing_flag boolean DEFAULT false,
  warranty_summary text,
  is_public boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contractor_id)
);

-- 3. contractor_businesses
CREATE TABLE IF NOT EXISTS public.contractor_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE UNIQUE,
  website_url text,
  phone text,
  email text,
  neq_number text,
  rbq_number text,
  tax_number_optional text,
  business_type text DEFAULT 'sole_proprietorship',
  employee_range text,
  average_project_size text,
  verified_identity_status text DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. contractor_locations
CREATE TABLE IF NOT EXISTS public.contractor_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  address_line_1 text,
  city text,
  province text DEFAULT 'QC',
  postal_code text,
  lat double precision,
  lng double precision,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. contractor_specialties
CREATE TABLE IF NOT EXISTS public.contractor_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  specialty_name text NOT NULL,
  proof_type text,
  proof_value text,
  confidence_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. contractor_licenses
CREATE TABLE IF NOT EXISTS public.contractor_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  authority_name text NOT NULL DEFAULT 'RBQ',
  license_type text,
  license_number text,
  status text DEFAULT 'unverified',
  verified_at timestamptz,
  expiry_date date,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. contractor_certifications
CREATE TABLE IF NOT EXISTS public.contractor_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  certification_name text NOT NULL,
  issuer text,
  issue_date date,
  expiry_date date,
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. contractor_insurances
CREATE TABLE IF NOT EXISTS public.contractor_insurances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  insurance_type text NOT NULL,
  provider_name text,
  policy_expiry_date date,
  proof_document_url text,
  verification_status text DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. contractor_portfolio_projects
CREATE TABLE IF NOT EXISTS public.contractor_portfolio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  city text,
  service_name text,
  before_image_url text,
  after_image_url text,
  gallery_urls jsonb DEFAULT '[]'::jsonb,
  featured_flag boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. contractor_faqs
CREATE TABLE IF NOT EXISTS public.contractor_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  faq_category text NOT NULL DEFAULT 'general',
  question text NOT NULL,
  answer text NOT NULL,
  related_service_id uuid,
  is_published boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  source_type text DEFAULT 'ai_generated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. contractor_review_sources
CREATE TABLE IF NOT EXISTS public.contractor_review_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  profile_url text,
  sync_status text DEFAULT 'pending',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. contractor_documents
CREATE TABLE IF NOT EXISTS public.contractor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_url text NOT NULL,
  extracted_text text,
  verification_status text DEFAULT 'pending',
  visibility_scope text DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 13. contractor_import_jobs
CREATE TABLE IF NOT EXISTS public.contractor_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'full_import',
  status text NOT NULL DEFAULT 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  progress_percent integer DEFAULT 0,
  confidence_score numeric DEFAULT 0,
  summary_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 14. contractor_import_sources
CREATE TABLE IF NOT EXISTS public.contractor_import_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_identifier text,
  source_url text,
  connection_status text DEFAULT 'pending',
  import_status text DEFAULT 'pending',
  confidence_score numeric DEFAULT 0,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 15. contractor_import_events
CREATE TABLE IF NOT EXISTS public.contractor_import_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.contractor_import_jobs(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  step_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 16. contractor_profile_gaps (renamed to avoid conflict with contractor_profile_scores if it existed)
CREATE TABLE IF NOT EXISTS public.contractor_profile_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  gap_type text NOT NULL,
  gap_label text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  impact_score numeric DEFAULT 0,
  suggested_action text,
  resolved_flag boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 17. contractor_objectives
CREATE TABLE IF NOT EXISTS public.contractor_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE UNIQUE,
  goal_more_appointments boolean DEFAULT false,
  goal_visibility_google boolean DEFAULT false,
  goal_visibility_ai boolean DEFAULT false,
  goal_fill_schedule boolean DEFAULT false,
  goal_exclusivity boolean DEFAULT false,
  goal_premium_projects boolean DEFAULT false,
  target_monthly_revenue integer,
  target_weekly_capacity integer,
  target_radius_km integer DEFAULT 50,
  urgency_level text DEFAULT 'moderate',
  growth_stage text DEFAULT 'growing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 18. contractor_plan_fits
CREATE TABLE IF NOT EXISTS public.contractor_plan_fits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  fit_score numeric DEFAULT 0,
  is_recommended boolean DEFAULT false,
  reasoning_json jsonb,
  projected_appointments_monthly integer,
  projected_visibility_gain numeric,
  projected_revenue_range jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 19. contractor_checkout_sessions
CREATE TABLE IF NOT EXISTS public.contractor_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  stripe_checkout_session_id text,
  status text NOT NULL DEFAULT 'pending',
  amount_subtotal integer,
  amount_tax integer,
  amount_total integer,
  coupon_code text,
  plan_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 20. contractor_activation_checklists
CREATE TABLE IF NOT EXISTS public.contractor_activation_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  checklist_key text NOT NULL,
  checklist_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  required_flag boolean DEFAULT true,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 21. contractor_activation_events
CREATE TABLE IF NOT EXISTS public.contractor_activation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_label text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 22. contractor_visibility_metrics
CREATE TABLE IF NOT EXISTS public.contractor_visibility_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  estimated_google_visibility numeric DEFAULT 0,
  estimated_ai_visibility numeric DEFAULT 0,
  profile_views integer DEFAULT 0,
  cta_clicks integer DEFAULT 0,
  lead_intents integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 23. contractor_ai_indexing_snapshots
CREATE TABLE IF NOT EXISTS public.contractor_ai_indexing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  entity_completeness_score numeric DEFAULT 0,
  faq_quality_score numeric DEFAULT 0,
  service_clarity_score numeric DEFAULT 0,
  geo_clarity_score numeric DEFAULT 0,
  trust_signal_score numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Enable RLS on all new tables
-- ============================================================
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_review_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_import_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_profile_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_plan_fits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_activation_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_activation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_visibility_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_ai_indexing_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies — Owner CRUD via owns_contractor()
-- ============================================================

-- Helper: list of tables that follow contractor_id ownership pattern
-- We create owner + admin policies for each

DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'contractor_profiles','contractor_businesses','contractor_locations',
    'contractor_specialties','contractor_licenses','contractor_certifications',
    'contractor_insurances','contractor_portfolio_projects','contractor_faqs',
    'contractor_review_sources','contractor_documents','contractor_import_jobs',
    'contractor_import_sources','contractor_profile_gaps','contractor_objectives',
    'contractor_plan_fits','contractor_checkout_sessions',
    'contractor_activation_checklists','contractor_activation_events',
    'contractor_visibility_metrics','contractor_ai_indexing_snapshots'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Owner SELECT
    EXECUTE format(
      'CREATE POLICY "owner_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.owns_contractor(contractor_id))',
      tbl
    );
    -- Owner INSERT
    EXECUTE format(
      'CREATE POLICY "owner_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.owns_contractor(contractor_id))',
      tbl
    );
    -- Owner UPDATE
    EXECUTE format(
      'CREATE POLICY "owner_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.owns_contractor(contractor_id))',
      tbl
    );
    -- Owner DELETE
    EXECUTE format(
      'CREATE POLICY "owner_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.owns_contractor(contractor_id))',
      tbl
    );
    -- Admin full access
    EXECUTE format(
      'CREATE POLICY "admin_all_%1$s" ON public.%1$I FOR ALL TO authenticated USING (public.is_admin())',
      tbl
    );
  END LOOP;
END $$;

-- Import events use import_job_id, need special policy
CREATE POLICY "owner_select_contractor_import_events" ON public.contractor_import_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contractor_import_jobs j
    WHERE j.id = import_job_id AND public.owns_contractor(j.contractor_id)
  ));
CREATE POLICY "admin_all_contractor_import_events" ON public.contractor_import_events
  FOR ALL TO authenticated USING (public.is_admin());

-- Public read for published FAQs
CREATE POLICY "public_read_published_faqs" ON public.contractor_faqs
  FOR SELECT TO anon USING (is_published = true);

-- Public read for portfolio projects
CREATE POLICY "public_read_portfolio" ON public.contractor_portfolio_projects
  FOR SELECT TO anon USING (true);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contractor_profiles_contractor ON public.contractor_profiles(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_businesses_contractor ON public.contractor_businesses(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_locations_contractor ON public.contractor_locations(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_faqs_contractor ON public.contractor_faqs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_import_jobs_contractor ON public.contractor_import_jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_profile_gaps_contractor ON public.contractor_profile_gaps(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_objectives_contractor ON public.contractor_objectives(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_plan_fits_contractor ON public.contractor_plan_fits(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_activation_checklists_contractor ON public.contractor_activation_checklists(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_visibility_metrics_contractor_date ON public.contractor_visibility_metrics(contractor_id, metric_date);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE TRIGGER update_contractor_profiles_updated_at BEFORE UPDATE ON public.contractor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contractor_businesses_updated_at BEFORE UPDATE ON public.contractor_businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contractor_faqs_updated_at BEFORE UPDATE ON public.contractor_faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contractor_objectives_updated_at BEFORE UPDATE ON public.contractor_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
