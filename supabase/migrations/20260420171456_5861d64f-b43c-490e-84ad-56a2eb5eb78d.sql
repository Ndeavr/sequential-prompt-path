-- WAR PROSPECTS
CREATE TABLE public.war_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('toiture','asphalte','gazon','peinture')),
  city TEXT NOT NULL DEFAULT 'Laval',
  website TEXT,
  phone TEXT,
  email TEXT,
  rating NUMERIC(2,1),
  reviews_count INTEGER DEFAULT 0,
  facebook_url TEXT,
  instagram_url TEXT,
  google_maps_url TEXT,
  address TEXT,
  postal_code TEXT,
  lead_score INTEGER DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','emailed','replied','booked')),
  email_subject TEXT,
  email_preview TEXT,
  notes TEXT,
  source TEXT DEFAULT 'web_search',
  enriched_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  emailed_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  campaign_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_name, city, category)
);

CREATE INDEX idx_war_prospects_status ON public.war_prospects(status);
CREATE INDEX idx_war_prospects_category ON public.war_prospects(category);
CREATE INDEX idx_war_prospects_city ON public.war_prospects(city);
CREATE INDEX idx_war_prospects_score ON public.war_prospects(lead_score DESC);

ALTER TABLE public.war_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read war_prospects"
ON public.war_prospects FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert war_prospects"
ON public.war_prospects FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update war_prospects"
ON public.war_prospects FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete war_prospects"
ON public.war_prospects FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access war_prospects"
ON public.war_prospects FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_war_prospects_updated_at
BEFORE UPDATE ON public.war_prospects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WAR PROSPECT LOGS
CREATE TABLE public.war_prospect_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.war_prospects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  actor TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_war_logs_prospect ON public.war_prospect_logs(prospect_id);
CREATE INDEX idx_war_logs_created ON public.war_prospect_logs(created_at DESC);

ALTER TABLE public.war_prospect_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read war_logs"
ON public.war_prospect_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role insert war_logs"
ON public.war_prospect_logs FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "Admins insert war_logs"
ON public.war_prospect_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- WAR CAMPAIGNS
CREATE TABLE public.war_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Laval',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','completed','paused','failed')),
  prospects_count INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  launched_by UUID,
  launched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.war_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage war_campaigns"
ON public.war_campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access war_campaigns"
ON public.war_campaigns FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_war_campaigns_updated_at
BEFORE UPDATE ON public.war_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.war_prospects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.war_prospect_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.war_campaigns;