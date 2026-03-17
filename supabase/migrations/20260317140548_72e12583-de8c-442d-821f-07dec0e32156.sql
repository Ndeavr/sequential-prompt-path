
-- ===========================================
-- AI Ads Engine + City-Service-Demand Engine
-- ===========================================

-- Ad Campaigns
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'google', -- google, meta
  campaign_name text NOT NULL,
  trade_slug text,
  city_slug text,
  status text NOT NULL DEFAULT 'draft', -- draft, active, paused, completed
  budget_daily_cents integer DEFAULT 0,
  budget_total_cents integer DEFAULT 0,
  spend_cents integer DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc_cents integer DEFAULT 0,
  cost_per_appointment_cents integer DEFAULT 0,
  keywords jsonb DEFAULT '[]',
  ad_copy jsonb DEFAULT '{}',
  targeting jsonb DEFAULT '{}',
  landing_page_url text,
  source_seo_page_id uuid,
  source_fingerprint_id uuid,
  optimization_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ad Groups within campaigns
CREATE TABLE public.ad_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE NOT NULL,
  group_name text NOT NULL,
  service_slug text,
  keywords jsonb DEFAULT '[]',
  negative_keywords jsonb DEFAULT '[]',
  ad_variants jsonb DEFAULT '[]', -- headlines, descriptions, hooks
  status text NOT NULL DEFAULT 'active',
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- City-Service-Demand Grid
CREATE TABLE public.city_service_demand_grid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  trade_slug text NOT NULL,
  service_slug text,
  season text, -- winter, spring, summer, fall
  urgency_level text DEFAULT 'normal',
  demand_score numeric DEFAULT 0,
  supply_score numeric DEFAULT 0,
  gap_score numeric DEFAULT 0, -- demand - supply
  estimated_value_cents integer DEFAULT 0,
  priority_rank integer DEFAULT 0,
  has_seo_page boolean DEFAULT false,
  has_ad_campaign boolean DEFAULT false,
  has_contractors boolean DEFAULT false,
  last_analyzed_at timestamptz,
  recommended_actions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(city_slug, trade_slug, service_slug, season)
);

-- Sales Psychology microcopy library
CREATE TABLE public.sales_microcopy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context text NOT NULL, -- homeowner_cta, contractor_cta, trust_badge, urgency, scarcity, social_proof
  placement text NOT NULL, -- hero, card, modal, button, tooltip, banner
  audience text NOT NULL DEFAULT 'homeowner', -- homeowner, contractor, both
  text_fr text NOT NULL,
  text_en text,
  psychology_principle text, -- urgency, scarcity, social_proof, authority, loss_aversion, simplicity
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  ab_test_variant text,
  conversion_rate numeric,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_service_demand_grid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_microcopy ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_manage_ad_campaigns" ON public.ad_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_ad_groups" ON public.ad_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_demand_grid" ON public.city_service_demand_grid FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_microcopy" ON public.sales_microcopy FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Public read for microcopy
CREATE POLICY "public_read_microcopy" ON public.sales_microcopy FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "auth_read_microcopy" ON public.sales_microcopy FOR SELECT TO authenticated USING (is_active = true);

-- Indexes
CREATE INDEX idx_ad_campaigns_platform ON public.ad_campaigns(platform);
CREATE INDEX idx_ad_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX idx_ad_campaigns_city ON public.ad_campaigns(city_slug);
CREATE INDEX idx_demand_grid_city ON public.city_service_demand_grid(city_slug);
CREATE INDEX idx_demand_grid_trade ON public.city_service_demand_grid(trade_slug);
CREATE INDEX idx_demand_grid_gap ON public.city_service_demand_grid(gap_score DESC);
CREATE INDEX idx_demand_grid_priority ON public.city_service_demand_grid(priority_rank);
CREATE INDEX idx_microcopy_context ON public.sales_microcopy(context, audience);
CREATE INDEX idx_microcopy_placement ON public.sales_microcopy(placement);
