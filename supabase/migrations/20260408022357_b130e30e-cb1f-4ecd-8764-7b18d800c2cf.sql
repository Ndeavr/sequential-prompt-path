
-- Service Entity Master
CREATE TABLE public.service_entity_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  intent_type TEXT NOT NULL DEFAULT 'problem',
  urgency_level TEXT NOT NULL DEFAULT 'medium',
  seasonality_qc TEXT DEFAULT 'all_year',
  description_fr TEXT,
  keywords_json JSONB DEFAULT '[]'::jsonb,
  related_entities_json JSONB DEFAULT '[]'::jsonb,
  avg_price_low INTEGER,
  avg_price_high INTEGER,
  contractor_types_json JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_entity_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read service entities" ON public.service_entity_master FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access service entities" ON public.service_entity_master FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service Entity City
CREATE TABLE public.service_entity_city (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.service_entity_master(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  demand_score INTEGER DEFAULT 50,
  priority INTEGER DEFAULT 5,
  local_context_fr TEXT,
  avg_price_low_local INTEGER,
  avg_price_high_local INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, city_slug)
);
ALTER TABLE public.service_entity_city ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read entity cities" ON public.service_entity_city FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access entity cities" ON public.service_entity_city FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Content Pages
CREATE TABLE public.content_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.service_entity_master(id) ON DELETE SET NULL,
  city TEXT,
  city_slug TEXT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  h1 TEXT NOT NULL,
  meta_description TEXT,
  content_json JSONB DEFAULT '{}'::jsonb,
  faq_json JSONB DEFAULT '[]'::jsonb,
  schema_json JSONB DEFAULT '{}'::jsonb,
  internal_links_json JSONB DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  generation_source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published pages" ON public.content_pages FOR SELECT USING (published = true);
CREATE POLICY "Admin full access pages" ON public.content_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Content Assets
CREATE TABLE public.content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.service_entity_master(id) ON DELETE SET NULL,
  page_id UUID REFERENCES public.content_pages(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL DEFAULT 'hero_image',
  url TEXT NOT NULL,
  alt_text TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read assets" ON public.content_assets FOR SELECT USING (true);
CREATE POLICY "Admin full access assets" ON public.content_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SERP Validation
CREATE TABLE public.serp_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.service_entity_master(id) ON DELETE CASCADE,
  city TEXT,
  query_text TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT false,
  variation_score NUMERIC DEFAULT 0,
  top_results_json JSONB DEFAULT '[]'::jsonb,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.serp_validation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only serp" ON public.serp_validation FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Demand Signals QC
CREATE TABLE public.demand_signals_qc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.service_entity_master(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'google_paa',
  raw_query TEXT,
  volume_estimate INTEGER DEFAULT 0,
  trend TEXT DEFAULT 'stable',
  city TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.demand_signals_qc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only demand" ON public.demand_signals_qc FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Revenue Events
CREATE TABLE public.revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  value_cents INTEGER DEFAULT 0,
  entity_id UUID REFERENCES public.service_entity_master(id) ON DELETE SET NULL,
  contractor_id UUID,
  user_id UUID,
  city TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only revenue" ON public.revenue_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Booking Events
CREATE TABLE public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.service_entity_master(id) ON DELETE SET NULL,
  contractor_id UUID,
  user_id UUID,
  city TEXT,
  source TEXT DEFAULT 'entity_page',
  booking_status TEXT DEFAULT 'initiated',
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only bookings" ON public.booking_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_service_entity_master_slug ON public.service_entity_master(slug);
CREATE INDEX idx_service_entity_master_category ON public.service_entity_master(category);
CREATE INDEX idx_service_entity_city_entity ON public.service_entity_city(entity_id);
CREATE INDEX idx_service_entity_city_slug ON public.service_entity_city(city_slug);
CREATE INDEX idx_content_pages_slug ON public.content_pages(slug);
CREATE INDEX idx_content_pages_entity ON public.content_pages(entity_id);
CREATE INDEX idx_content_pages_published ON public.content_pages(published) WHERE published = true;
CREATE INDEX idx_serp_validation_entity ON public.serp_validation(entity_id);
CREATE INDEX idx_revenue_events_entity ON public.revenue_events(entity_id);
CREATE INDEX idx_booking_events_entity ON public.booking_events(entity_id);

-- Updated at triggers
CREATE TRIGGER set_updated_at_service_entity_master BEFORE UPDATE ON public.service_entity_master FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_service_entity_city BEFORE UPDATE ON public.service_entity_city FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_content_pages BEFORE UPDATE ON public.content_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
