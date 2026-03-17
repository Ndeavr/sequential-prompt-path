
-- Autopilot Rules
CREATE TABLE public.autopilot_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL DEFAULT 'data',
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_type text NOT NULL DEFAULT 'suggest_solution',
  priority integer NOT NULL DEFAULT 5,
  label_fr text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.autopilot_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access autopilot_rules" ON public.autopilot_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Autopilot Events
CREATE TABLE public.autopilot_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  rule_id uuid REFERENCES public.autopilot_rules(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'risk_detected',
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  triggered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.autopilot_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access autopilot_events" ON public.autopilot_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner read autopilot_events" ON public.autopilot_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
);

-- Autopilot Actions
CREATE TABLE public.autopilot_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.autopilot_events(id) ON DELETE SET NULL,
  action_type text NOT NULL DEFAULT 'suggest_solution',
  payload_json jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.autopilot_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access autopilot_actions" ON public.autopilot_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner read autopilot_actions" ON public.autopilot_actions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
);

-- User Notifications
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'unread',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access user_notifications" ON public.user_notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User own notifications" ON public.user_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User update own notifications" ON public.user_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- SEO Templates
CREATE TABLE public.seo_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL DEFAULT 'problem_city',
  structure_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access seo_templates" ON public.seo_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read seo_templates" ON public.seo_templates FOR SELECT TO anon USING (is_active = true);

-- SEO Generation Queue
CREATE TABLE public.seo_generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  problem text NOT NULL,
  property_type text,
  template_id uuid REFERENCES public.seo_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  result_page_id uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.seo_generation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access seo_generation_queue" ON public.seo_generation_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SEO Metrics
CREATE TABLE public.seo_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL,
  page_type text NOT NULL DEFAULT 'seo_page',
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  avg_rank numeric DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access seo_metrics" ON public.seo_metrics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
