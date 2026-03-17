
-- Voice sessions for Alex voice concierge
CREATE TABLE public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deep_link_id uuid,
  feature text NOT NULL DEFAULT 'design',
  transcript text,
  context_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access voice_sessions" ON public.voice_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User own voice_sessions" ON public.voice_sessions FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anon insert voice_sessions" ON public.voice_sessions FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- Voice events
CREATE TABLE public.voice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.voice_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL DEFAULT 'start',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access voice_events" ON public.voice_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert voice_events" ON public.voice_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon insert voice_events" ON public.voice_events FOR INSERT TO anon WITH CHECK (true);

-- Auto-generated campaigns
CREATE TABLE public.auto_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_pattern jsonb DEFAULT '{}'::jsonb,
  target_city text,
  feature text,
  placement_type text,
  status text NOT NULL DEFAULT 'draft',
  expected_lift_pct numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auto_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access auto_campaigns" ON public.auto_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Campaign templates AI
CREATE TABLE public.campaign_templates_ai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL DEFAULT 'expansion',
  feature text,
  placement_type text,
  config_json jsonb DEFAULT '{}'::jsonb,
  performance_score numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_templates_ai ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access campaign_templates_ai" ON public.campaign_templates_ai FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Campaign generations
CREATE TABLE public.campaign_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_campaign_id uuid REFERENCES public.auto_campaigns(id) ON DELETE CASCADE NOT NULL,
  generated_assets jsonb DEFAULT '{}'::jsonb,
  rules_applied jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access campaign_generations" ON public.campaign_generations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
