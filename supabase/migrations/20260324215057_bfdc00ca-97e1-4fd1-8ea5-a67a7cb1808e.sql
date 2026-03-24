
-- Screen Catalog
CREATE TABLE IF NOT EXISTS public.screen_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key text NOT NULL UNIQUE,
  screen_name text NOT NULL,
  route_pattern text NOT NULL,
  entity_type text,
  role_scope text[],
  share_priority_weight integer NOT NULL DEFAULT 5,
  is_share_worthy boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Screenshot Events
CREATE TABLE IF NOT EXISTS public.screenshot_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  role text,
  platform text NOT NULL,
  app_version text,
  screen_key text NOT NULL,
  screen_name text NOT NULL,
  route_path text NOT NULL,
  entity_type text,
  entity_id uuid,
  entity_slug text,
  share_prompt_shown boolean NOT NULL DEFAULT false,
  share_prompt_variant text,
  share_cta_clicked boolean NOT NULL DEFAULT false,
  share_method text,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Share Link Events
CREATE TABLE IF NOT EXISTS public.share_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  screenshot_event_id uuid REFERENCES public.screenshot_events(id) ON DELETE SET NULL,
  screen_key text NOT NULL,
  route_path text NOT NULL,
  entity_type text,
  entity_id uuid,
  share_method text NOT NULL,
  share_link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User Share Preferences
CREATE TABLE IF NOT EXISTS public.user_share_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  preferred_share_method text,
  times_prompt_seen_this_session integer NOT NULL DEFAULT 0,
  times_prompt_dismissed_total integer NOT NULL DEFAULT 0,
  last_prompt_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Screen Friction Scores
CREATE TABLE IF NOT EXISTS public.screen_friction_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key text NOT NULL,
  screen_name text NOT NULL,
  time_window text NOT NULL DEFAULT '7d',
  total_views integer NOT NULL DEFAULT 0,
  total_screenshots integer NOT NULL DEFAULT 0,
  total_prompt_shown integer NOT NULL DEFAULT 0,
  total_prompt_dismissed integer NOT NULL DEFAULT 0,
  total_share_converted integer NOT NULL DEFAULT 0,
  screenshot_rate_percent numeric(6,2) NOT NULL DEFAULT 0,
  prompt_conversion_rate_percent numeric(6,2) NOT NULL DEFAULT 0,
  dismiss_rate_percent numeric(6,2) NOT NULL DEFAULT 0,
  friction_score numeric(6,2) NOT NULL DEFAULT 0,
  friction_level text NOT NULL DEFAULT 'low',
  last_calculated_at timestamptz NOT NULL DEFAULT now()
);

-- Screenshot Alerts
CREATE TABLE IF NOT EXISTS public.screenshot_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key text NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  metric_snapshot jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Screenshot Recommendations
CREATE TABLE IF NOT EXISTS public.screenshot_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key text NOT NULL,
  recommendation_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  supporting_metrics jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_screenshot_events_created_at ON public.screenshot_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshot_events_screen_key ON public.screenshot_events(screen_key);
CREATE INDEX IF NOT EXISTS idx_screenshot_events_user_id ON public.screenshot_events(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_events_role ON public.screenshot_events(role);
CREATE INDEX IF NOT EXISTS idx_screenshot_events_platform ON public.screenshot_events(platform);
CREATE INDEX IF NOT EXISTS idx_share_link_events_created_at ON public.share_link_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_link_events_screenshot_event_id ON public.share_link_events(screenshot_event_id);
CREATE INDEX IF NOT EXISTS idx_screen_friction_scores_screen_key ON public.screen_friction_scores(screen_key);
CREATE INDEX IF NOT EXISTS idx_screenshot_alerts_status ON public.screenshot_alerts(status);
CREATE INDEX IF NOT EXISTS idx_screenshot_recommendations_status ON public.screenshot_recommendations(status);

-- RLS
ALTER TABLE public.screen_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_link_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_share_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_friction_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshot_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshot_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read screen catalog" ON public.screen_catalog FOR SELECT USING (true);
CREATE POLICY "Admins manage screen catalog" ON public.screen_catalog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own screenshot events" ON public.screenshot_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own screenshot events" ON public.screenshot_events FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon insert screenshot events" ON public.screenshot_events FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Users insert own share link events" ON public.share_link_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own share link events" ON public.share_link_events FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users manage own share preferences" ON public.user_share_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read friction scores" ON public.screen_friction_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage friction scores" ON public.screen_friction_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read screenshot alerts" ON public.screenshot_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage screenshot alerts" ON public.screenshot_alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read screenshot recommendations" ON public.screenshot_recommendations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage screenshot recommendations" ON public.screenshot_recommendations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Views
CREATE OR REPLACE VIEW public.screenshot_analytics_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  count(*) AS total_screenshots,
  count(DISTINCT user_id) AS unique_users,
  count(*) FILTER (WHERE share_cta_clicked = true) AS total_shared_after_prompt
FROM public.screenshot_events
GROUP BY 1 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW public.screenshot_top_screens AS
SELECT
  screen_key,
  screen_name,
  count(*) AS total_screenshots,
  count(*) FILTER (WHERE share_cta_clicked = true) AS total_converted_shares
FROM public.screenshot_events
GROUP BY 1,2 ORDER BY total_screenshots DESC;

CREATE OR REPLACE VIEW public.screenshot_conversion_summary AS
SELECT
  count(*) AS total_screenshots,
  count(*) FILTER (WHERE share_cta_clicked = true) AS total_converted,
  CASE WHEN count(*) = 0 THEN 0
    ELSE round((count(*) FILTER (WHERE share_cta_clicked = true)::numeric / count(*)::numeric) * 100, 2)
  END AS conversion_rate_percent
FROM public.screenshot_events;

CREATE OR REPLACE VIEW public.screenshot_role_breakdown AS
SELECT
  coalesce(role, 'unknown') AS role,
  count(*) AS total_screenshots,
  count(*) FILTER (WHERE share_cta_clicked = true) AS total_converted
FROM public.screenshot_events
GROUP BY 1 ORDER BY total_screenshots DESC;

CREATE OR REPLACE VIEW public.screen_friction_summary AS
SELECT
  screen_key, screen_name, friction_score, friction_level,
  total_screenshots, total_share_converted, dismiss_rate_percent,
  prompt_conversion_rate_percent, last_calculated_at
FROM public.screen_friction_scores
ORDER BY friction_score DESC;

CREATE OR REPLACE VIEW public.screenshot_alert_summary AS
SELECT status, severity, count(*) AS total_alerts
FROM public.screenshot_alerts GROUP BY 1,2 ORDER BY total_alerts DESC;

CREATE OR REPLACE VIEW public.screenshot_recommendation_summary AS
SELECT status, priority, count(*) AS total_recommendations
FROM public.screenshot_recommendations GROUP BY 1,2 ORDER BY total_recommendations DESC;
