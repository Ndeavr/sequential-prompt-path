
-- prospect_pages
CREATE TABLE public.prospect_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  city TEXT,
  service TEXT,
  phone TEXT,
  logo_url TEXT,
  visibility_score INT,
  ai_score INT,
  google_score INT,
  trust_score INT,
  territory_score INT,
  opportunities JSONB DEFAULT '[]'::jsonb,
  google_reviews JSONB DEFAULT '{}'::jsonb,
  territory_data JSONB DEFAULT '{}'::jsonb,
  short_link TEXT,
  stripe_customer_id TEXT,
  activated BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_pages_slug ON public.prospect_pages(slug);
CREATE INDEX idx_prospect_pages_phone ON public.prospect_pages(phone);

ALTER TABLE public.prospect_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read prospect pages by slug"
  ON public.prospect_pages FOR SELECT
  USING (true);

CREATE POLICY "Admins manage prospect pages"
  ON public.prospect_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- sms_campaigns
CREATE TABLE public.sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_page_id UUID REFERENCES public.prospect_pages(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  sms_variant TEXT NOT NULL CHECK (sms_variant IN ('A','B','C')),
  sms_body TEXT NOT NULL,
  short_link TEXT,
  twilio_sid TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clicked_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  conversion_status TEXT NOT NULL DEFAULT 'sent',
  error TEXT
);

CREATE INDEX idx_sms_campaigns_phone ON public.sms_campaigns(phone);
CREATE INDEX idx_sms_campaigns_status ON public.sms_campaigns(conversion_status);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sms campaigns"
  ON public.sms_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- short_links
CREATE TABLE public.short_links (
  slug TEXT PRIMARY KEY,
  target_path TEXT NOT NULL,
  prospect_page_id UUID REFERENCES public.prospect_pages(id) ON DELETE CASCADE,
  click_count INT NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read short links"
  ON public.short_links FOR SELECT USING (true);

CREATE POLICY "Admins manage short links"
  ON public.short_links FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- short_link_clicks
CREATE TABLE public.short_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT,
  ip_hash TEXT
);

CREATE INDEX idx_short_link_clicks_slug ON public.short_link_clicks(slug);

ALTER TABLE public.short_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert clicks"
  ON public.short_link_clicks FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins read clicks"
  ON public.short_link_clicks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- prospect_page_events
CREATE TABLE public.prospect_page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_prospect_events_slug ON public.prospect_page_events(slug);
CREATE INDEX idx_prospect_events_type ON public.prospect_page_events(event_type);

ALTER TABLE public.prospect_page_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert events"
  ON public.prospect_page_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins read events"
  ON public.prospect_page_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger for prospect_pages
CREATE TRIGGER trg_prospect_pages_updated
BEFORE UPDATE ON public.prospect_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
