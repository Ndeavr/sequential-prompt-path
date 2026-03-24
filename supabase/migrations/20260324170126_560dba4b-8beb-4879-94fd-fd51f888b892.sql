
-- Business import jobs
CREATE TABLE public.business_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  source_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  source_url text,
  raw_payload_json jsonb DEFAULT '{}'::jsonb,
  normalized_payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own import jobs" ON public.business_import_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Business entities
CREATE TABLE public.business_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  business_name text NOT NULL,
  phone text,
  email text,
  website_url text,
  description_short text,
  description_long text,
  primary_city text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business entities" ON public.business_entities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Business services
CREATE TABLE public.business_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  service_category text NOT NULL,
  service_subcategory text,
  specialization_label text,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business services" ON public.business_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Business locations
CREATE TABLE public.business_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  city text,
  region text,
  service_radius_km integer,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business locations" ON public.business_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Business assets
CREATE TABLE public.business_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  asset_type text NOT NULL,
  file_path text,
  external_url text,
  is_logo boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business assets" ON public.business_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profile missing fields
CREATE TABLE public.profile_missing_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  field_name text NOT NULL,
  priority text NOT NULL DEFAULT 'important',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_missing_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own missing fields" ON public.profile_missing_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profile completion events
CREATE TABLE public.profile_completion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  action_type text NOT NULL,
  impact_score numeric DEFAULT 0,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_completion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own completion events" ON public.profile_completion_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for business assets
INSERT INTO storage.buckets (id, name, public) VALUES ('business-assets', 'business-assets', false);
CREATE POLICY "Auth users upload business assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-assets');
CREATE POLICY "Auth users read own business assets" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'business-assets');
CREATE POLICY "Auth users delete own business assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'business-assets');
