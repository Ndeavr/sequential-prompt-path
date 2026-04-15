
-- Table: route_redirect_rules
CREATE TABLE public.route_redirect_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_path TEXT NOT NULL,
  target_path TEXT NOT NULL,
  redirect_type TEXT NOT NULL DEFAULT 'soft_fallback',
  intent_type TEXT NOT NULL DEFAULT 'generic',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_route_redirect_rules_source ON public.route_redirect_rules (source_path) WHERE is_active = true;

ALTER TABLE public.route_redirect_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active redirect rules" ON public.route_redirect_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage redirect rules" ON public.route_redirect_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Table: route_access_policies
CREATE TABLE public.route_access_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_pattern TEXT NOT NULL,
  access_type TEXT NOT NULL DEFAULT 'public',
  allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  fallback_strategy TEXT NOT NULL DEFAULT 'home_redirect',
  noindex BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_route_access_policies_pattern ON public.route_access_policies (path_pattern) WHERE is_active = true;

ALTER TABLE public.route_access_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active access policies" ON public.route_access_policies FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage access policies" ON public.route_access_policies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Table: broken_link_events
CREATE TABLE public.broken_link_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_path TEXT,
  attempted_path TEXT NOT NULL,
  resolved_path TEXT,
  user_role TEXT,
  user_id UUID,
  referrer TEXT,
  resolution_type TEXT NOT NULL DEFAULT 'fallback_rendered',
  was_google_entry BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_broken_link_events_attempted ON public.broken_link_events (attempted_path);
CREATE INDEX idx_broken_link_events_created ON public.broken_link_events (created_at DESC);

ALTER TABLE public.broken_link_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon and auth can insert broken link events" ON public.broken_link_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view broken link events" ON public.broken_link_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Table: indexed_route_fallbacks
CREATE TABLE public.indexed_route_fallbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obsolete_path TEXT NOT NULL,
  replacement_path TEXT NOT NULL,
  replacement_reason TEXT,
  http_status INTEGER NOT NULL DEFAULT 302,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_indexed_route_fallbacks_path ON public.indexed_route_fallbacks (obsolete_path) WHERE is_active = true;

ALTER TABLE public.indexed_route_fallbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active fallbacks" ON public.indexed_route_fallbacks FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage fallbacks" ON public.indexed_route_fallbacks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
