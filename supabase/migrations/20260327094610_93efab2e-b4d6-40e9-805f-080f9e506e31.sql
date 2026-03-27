
-- Prospection Engine Tables (excluding prospect_import_jobs which exists)

CREATE TABLE IF NOT EXISTS public.prospection_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campaign_type text DEFAULT 'acquisition',
  target_category text,
  target_city text,
  target_region text,
  target_province text DEFAULT 'QC',
  target_count int DEFAULT 100,
  language text DEFAULT 'fr',
  status text DEFAULT 'draft',
  source_config_json jsonb DEFAULT '{}'::jsonb,
  outreach_channel text DEFAULT 'email',
  default_promo_code text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  launched_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.prospection_campaigns(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  slug text,
  main_city text,
  region_name text,
  province text DEFAULT 'QC',
  country text DEFAULT 'CA',
  status text DEFAULT 'discovered',
  priority_level text DEFAULT 'medium',
  confidence_score numeric DEFAULT 0,
  has_website boolean DEFAULT false,
  has_google_presence boolean DEFAULT false,
  has_reviews boolean DEFAULT false,
  has_phone boolean DEFAULT false,
  has_email boolean DEFAULT false,
  dedup_status text DEFAULT 'clean',
  aipp_pre_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prospect_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_url text,
  source_label text,
  source_status text DEFAULT 'discovered',
  confidence_score numeric DEFAULT 0,
  last_checked_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.prospect_raw_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  raw_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prospect_normalized_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  normalized_json jsonb NOT NULL,
  field_confidence_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prospect_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  aipp_pre_score numeric DEFAULT 0,
  web_presence_score numeric DEFAULT 0,
  reviews_score numeric DEFAULT 0,
  identity_clarity_score numeric DEFAULT 0,
  trust_signal_score numeric DEFAULT 0,
  service_clarity_score numeric DEFAULT 0,
  territory_clarity_score numeric DEFAULT 0,
  conversion_priority_score numeric DEFAULT 0,
  scored_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prospect_contact_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  contact_type text NOT NULL,
  contact_value text NOT NULL,
  is_primary boolean DEFAULT false,
  is_validated boolean DEFAULT false,
  source_type text
);

CREATE TABLE IF NOT EXISTS public.prospect_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  category_key text NOT NULL,
  category_label text NOT NULL,
  is_primary boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.prospect_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  city_name text,
  region_name text,
  province text DEFAULT 'QC',
  is_primary boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.prospect_web_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_url text NOT NULL,
  source_type text,
  is_logo boolean DEFAULT false,
  is_cover boolean DEFAULT false,
  sort_order int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.prospect_reviews_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  source_type text,
  review_count int DEFAULT 0,
  average_rating numeric DEFAULT 0,
  summary_json jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.prospect_alex_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.prospection_campaigns(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  landing_url text,
  prefill_json jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_opened_at timestamptz,
  open_count int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.prospect_outreach_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.prospection_campaigns(id) ON DELETE CASCADE,
  sequence_name text NOT NULL,
  channel_type text NOT NULL,
  step_order int NOT NULL,
  subject_template text,
  body_template text,
  delay_hours int DEFAULT 0,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.prospect_outreach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.prospection_campaigns(id) ON DELETE CASCADE,
  sequence_id uuid REFERENCES public.prospect_outreach_sequences(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_status text,
  provider text,
  provider_ref text,
  payload_json jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prospect_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_value text,
  event_meta_json jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prospect_dedup_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  possible_duplicate_of uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  similarity_score numeric DEFAULT 0,
  review_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prospection_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.prospection_campaigns(id) ON DELETE CASCADE,
  job_status text DEFAULT 'queued',
  total_found int DEFAULT 0,
  total_imported int DEFAULT 0,
  total_failed int DEFAULT 0,
  progress_percent int DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.prospect_admin_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  review_reason text,
  review_status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prospects_campaign ON public.prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_city ON public.prospects(main_city);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON public.prospects(aipp_pre_score DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_alex_links_token ON public.prospect_alex_links(token);
CREATE INDEX IF NOT EXISTS idx_prospect_outreach_events_prospect ON public.prospect_outreach_events(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_scores_prospect ON public.prospect_scores(prospect_id);

-- RLS
ALTER TABLE public.prospection_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_raw_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_normalized_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_contact_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_web_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_reviews_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_alex_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_outreach_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_dedup_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospection_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_admin_reviews ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "admin_manage_prospection_campaigns" ON public.prospection_campaigns FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospects" ON public.prospects FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_sources" ON public.prospect_sources FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_raw_data" ON public.prospect_raw_data FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_normalized_data" ON public.prospect_normalized_data FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_scores" ON public.prospect_scores FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_contact_points" ON public.prospect_contact_points FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_categories" ON public.prospect_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_service_areas" ON public.prospect_service_areas FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_web_assets" ON public.prospect_web_assets FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_reviews_summary" ON public.prospect_reviews_summary FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_alex_links" ON public.prospect_alex_links FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_outreach_sequences" ON public.prospect_outreach_sequences FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_outreach_events" ON public.prospect_outreach_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_conversion_events" ON public.prospect_conversion_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_dedup_queue" ON public.prospect_dedup_queue FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospection_import_jobs" ON public.prospection_import_jobs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_prospect_admin_reviews" ON public.prospect_admin_reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Public read for alex links (prospects access their personalized link)
CREATE POLICY "public_read_active_alex_links" ON public.prospect_alex_links FOR SELECT USING (is_active = true);
