
-- =============================================
-- AIPP Enrichment Layer for Outbound CRM
-- =============================================

-- 1. Prospect Enrichments (website signals)
CREATE TABLE public.prospect_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL,
  website_title TEXT,
  website_meta_description TEXT,
  has_https BOOLEAN DEFAULT false,
  has_schema BOOLEAN DEFAULT false,
  has_faq BOOLEAN DEFAULT false,
  has_booking_cta BOOLEAN DEFAULT false,
  has_reviews_widget BOOLEAN DEFAULT false,
  has_service_pages BOOLEAN DEFAULT false,
  has_city_pages BOOLEAN DEFAULT false,
  has_before_after_gallery BOOLEAN DEFAULT false,
  has_phone_visible BOOLEAN DEFAULT false,
  has_email_visible BOOLEAN DEFAULT false,
  has_financing_visible BOOLEAN DEFAULT false,
  detected_platform TEXT,
  estimated_review_count INT DEFAULT 0,
  estimated_google_rating NUMERIC(2,1),
  enrichment_payload JSONB DEFAULT '{}'::jsonb,
  enriched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link to outbound_companies (the existing prospect entity)
CREATE INDEX idx_prospect_enrichments_prospect ON public.prospect_enrichments(prospect_id);

ALTER TABLE public.prospect_enrichments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on prospect_enrichments"
  ON public.prospect_enrichments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Prospect Domains
CREATE TABLE public.prospect_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL,
  domain TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  mx_detected BOOLEAN,
  website_live BOOLEAN,
  screenshot_url TEXT,
  dns_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_domains_prospect ON public.prospect_domains(prospect_id);

ALTER TABLE public.prospect_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on prospect_domains"
  ON public.prospect_domains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Prospect Social Profiles
CREATE TABLE public.prospect_social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL,
  platform TEXT NOT NULL,
  profile_url TEXT,
  followers_estimate INT,
  active_status TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_social_prospect ON public.prospect_social_profiles(prospect_id);

ALTER TABLE public.prospect_social_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on prospect_social_profiles"
  ON public.prospect_social_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Prospect AIPP Scores
CREATE TABLE public.prospect_aipp_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL,
  score_global INT DEFAULT 0,
  visibility_score INT DEFAULT 0,
  structure_score INT DEFAULT 0,
  trust_score INT DEFAULT 0,
  conversion_score INT DEFAULT 0,
  content_score INT DEFAULT 0,
  local_presence_score INT DEFAULT 0,
  ai_readiness_score INT DEFAULT 0,
  score_level TEXT DEFAULT 'unknown',
  summary_headline TEXT,
  summary_short TEXT,
  top_issues JSONB DEFAULT '[]'::jsonb,
  quick_wins JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_aipp_scores_prospect ON public.prospect_aipp_scores(prospect_id);
CREATE INDEX idx_prospect_aipp_scores_level ON public.prospect_aipp_scores(score_level);

ALTER TABLE public.prospect_aipp_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on prospect_aipp_scores"
  ON public.prospect_aipp_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Prospect AIPP Factors
CREATE TABLE public.prospect_aipp_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL,
  factor_key TEXT NOT NULL,
  factor_label TEXT NOT NULL,
  factor_value NUMERIC DEFAULT 0,
  factor_weight NUMERIC DEFAULT 1,
  factor_status TEXT DEFAULT 'neutral',
  factor_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_aipp_factors_prospect ON public.prospect_aipp_factors(prospect_id);

ALTER TABLE public.prospect_aipp_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on prospect_aipp_factors"
  ON public.prospect_aipp_factors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
