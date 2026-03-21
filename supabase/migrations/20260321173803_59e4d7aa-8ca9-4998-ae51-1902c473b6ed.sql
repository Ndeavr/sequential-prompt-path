
-- UNPRO Acquisition Engine — contractors_prospects
CREATE TABLE public.contractors_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  legal_name text,
  city text,
  region text,
  category text,
  subcategory text,
  website text,
  domain text,
  email text,
  phone text,
  google_maps_url text,
  source text,
  source_detail text,
  service_area text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  priority_tier text NOT NULL DEFAULT 'B',
  aipp_score int,
  seo_score int,
  reviews_score int,
  content_score int,
  ai_score int,
  branding_score int,
  trust_score int,
  local_score int,
  conversion_score int,
  score_confidence int DEFAULT 50,
  diagnostic_summary text,
  diagnostic jsonb,
  quick_wins jsonb,
  competitor_gap jsonb,
  estimated_monthly_loss_min int,
  estimated_monthly_loss_max int,
  is_running_ads boolean DEFAULT false,
  paid_intent_confidence int DEFAULT 0,
  screenshot_url text,
  screenshot_mobile_url text,
  loom_script text,
  loom_status text DEFAULT 'pending',
  landing_slug text UNIQUE,
  landing_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospects_status ON public.contractors_prospects(status);
CREATE INDEX idx_prospects_city ON public.contractors_prospects(city);
CREATE INDEX idx_prospects_category ON public.contractors_prospects(category);
CREATE INDEX idx_prospects_priority ON public.contractors_prospects(priority_tier);
CREATE INDEX idx_prospects_slug ON public.contractors_prospects(landing_slug);
CREATE INDEX idx_prospects_score ON public.contractors_prospects(aipp_score);

-- Reviews snapshot
CREATE TABLE public.contractor_reviews_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  review_count int,
  rating numeric,
  review_velocity_90d int,
  google_present boolean DEFAULT false,
  facebook_present boolean DEFAULT false,
  bbb_present boolean DEFAULT false,
  other_sources jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Site snapshot
CREATE TABLE public.contractor_site_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  website text,
  title text,
  meta_description text,
  h1 text,
  h2_count int,
  word_count int,
  has_schema boolean DEFAULT false,
  has_local_pages boolean DEFAULT false,
  has_blog boolean DEFAULT false,
  has_cta boolean DEFAULT false,
  has_financing boolean DEFAULT false,
  has_reviews_section boolean DEFAULT false,
  has_before_after boolean DEFAULT false,
  mobile_friendly boolean DEFAULT true,
  page_speed_estimate int,
  screenshot_url text,
  html_excerpt text,
  extracted_signals jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prospect email campaigns
CREATE TABLE public.prospect_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  campaign_name text,
  subject text,
  body_html text,
  body_text text,
  from_name text,
  from_email text,
  sent_at timestamptz,
  open_count int DEFAULT 0,
  click_count int DEFAULT 0,
  replied boolean DEFAULT false,
  bounced boolean DEFAULT false,
  tracking_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prospect email events
CREATE TABLE public.prospect_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.prospect_email_campaigns(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prospect bookings
CREATE TABLE public.prospect_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  company text,
  category text,
  city text,
  preferred_time text,
  project_type text,
  notes text,
  source text DEFAULT 'audit_landing',
  booked_at timestamptz DEFAULT now(),
  status text DEFAULT 'new'
);

-- Admin import jobs
CREATE TABLE public.prospect_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text,
  storage_path text,
  row_count int,
  imported_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text DEFAULT 'processing',
  errors jsonb
);

-- Scraper jobs
CREATE TABLE public.prospect_scraper_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text,
  category text,
  source text,
  query text,
  status text DEFAULT 'queued',
  total_found int DEFAULT 0,
  total_inserted int DEFAULT 0,
  logs jsonb,
  created_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

-- Loom video jobs
CREATE TABLE public.prospect_loom_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors_prospects(id) ON DELETE CASCADE,
  script text,
  personalized_intro text,
  screenshot_url text,
  status text DEFAULT 'pending',
  video_url text,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

-- Acquisition settings
CREATE TABLE public.prospect_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_prospect_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_prospects_updated_at
  BEFORE UPDATE ON public.contractors_prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_prospect_updated_at();

-- RLS
ALTER TABLE public.contractors_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_reviews_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_site_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_scraper_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_loom_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_all_prospects" ON public.contractors_prospects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_reviews_snap" ON public.contractor_reviews_snapshot FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_site_snap" ON public.contractor_site_snapshot FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_prospect_campaigns" ON public.prospect_email_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_prospect_events" ON public.prospect_email_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_prospect_imports" ON public.prospect_import_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_prospect_scraper" ON public.prospect_scraper_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_prospect_loom" ON public.prospect_loom_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_prospect_settings" ON public.prospect_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public can read prospects by slug (for landing pages) and submit bookings
CREATE POLICY "public_read_prospect_by_slug" ON public.contractors_prospects FOR SELECT TO anon USING (landing_slug IS NOT NULL AND status IN ('landing_ready','emailed','opened','clicked','replied','booked','won'));
CREATE POLICY "public_insert_booking" ON public.prospect_bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "admin_all_prospect_bookings" ON public.prospect_bookings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed settings
INSERT INTO public.prospect_settings (key, value) VALUES
  ('booking_link', '"https://calendly.com/unpro"'),
  ('sender_name', '"Alex — UnPRO"'),
  ('sender_email', '"alex@unpro.ca"'),
  ('reply_to_email', '"info@unpro.ca"'),
  ('city_default', '"Laval"'),
  ('max_slots_per_category', '5'),
  ('default_top_competitor_score', '78'),
  ('urgency_message', '"Seulement 5 entrepreneurs par catégorie à Laval"'),
  ('brand_name', '"UnPRO"'),
  ('audit_badge', '"Analyse IA 2026"');
