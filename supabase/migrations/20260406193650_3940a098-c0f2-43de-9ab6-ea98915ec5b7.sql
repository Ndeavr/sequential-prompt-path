
CREATE TABLE IF NOT EXISTS public.navigation_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nav_key text NOT NULL,
  placement text,
  persona_key text,
  page_path text,
  clicked_at timestamptz DEFAULT now()
);

ALTER TABLE public.navigation_click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own nav clicks"
  ON public.navigation_click_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can insert nav clicks"
  ON public.navigation_click_events
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Admins can read all nav clicks"
  ON public.navigation_click_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_nav_clicks_nav_key ON public.navigation_click_events(nav_key);
CREATE INDEX idx_nav_clicks_clicked_at ON public.navigation_click_events(clicked_at);
