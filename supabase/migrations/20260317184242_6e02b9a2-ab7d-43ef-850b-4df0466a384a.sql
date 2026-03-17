
-- 1. CONTRACTOR AUTO-ACCEPT SETTINGS
CREATE TABLE public.contractor_auto_accept_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  categories text[] DEFAULT '{}',
  subtypes text[] DEFAULT '{}',
  excluded_types text[] DEFAULT '{}',
  max_radius_km numeric DEFAULT 15,
  severities text[] DEFAULT ARRAY['urgent','high','critical'],
  requires_photo boolean DEFAULT false,
  requires_callback boolean DEFAULT false,
  confidence_threshold numeric DEFAULT 0.6,
  time_windows jsonb DEFAULT '[]',
  storm_mode text DEFAULT 'both' CHECK (storm_mode IN ('active_only','inactive_only','both')),
  preset_key text,
  admin_disabled boolean DEFAULT false,
  admin_disabled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contractor_id)
);
ALTER TABLE public.contractor_auto_accept_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors manage own auto-accept settings"
  ON public.contractor_auto_accept_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 2. CONTRACTOR CAPACITY STATE
CREATE TABLE public.contractor_capacity_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  availability_status text NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available','limited','unavailable','emergency_only')),
  max_active_emergencies integer DEFAULT 2,
  max_pending_accepted integer DEFAULT 3,
  max_parallel_callbacks integer DEFAULT 2,
  daily_emergency_limit integer DEFAULT 5,
  after_hours_limit integer DEFAULT 2,
  overnight_limit integer DEFAULT 1,
  weekend_limit integer DEFAULT 3,
  emergency_radius_km numeric DEFAULT 15,
  paused_until timestamptz,
  overnight_mode boolean DEFAULT false,
  active_count integer DEFAULT 0,
  pending_count integer DEFAULT 0,
  en_route_count integer DEFAULT 0,
  arrived_count integer DEFAULT 0,
  completed_today integer DEFAULT 0,
  last_reset_date date DEFAULT CURRENT_DATE,
  storm_accept boolean DEFAULT false,
  storm_categories text[] DEFAULT '{}',
  storm_radius_km numeric,
  storm_capacity_boost integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contractor_id)
);
ALTER TABLE public.contractor_capacity_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors manage own capacity"
  ON public.contractor_capacity_state FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 3. AUTO-ACCEPT EVENTS (audit)
CREATE TABLE public.contractor_auto_accept_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.emergency_requests(id),
  decision text NOT NULL CHECK (decision IN ('accepted','rejected','blocked','throttled')),
  reason text,
  rule_snapshot jsonb,
  capacity_snapshot jsonb,
  evaluation_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_auto_accept_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors view own events admins all"
  ON public.contractor_auto_accept_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts events"
  ON public.contractor_auto_accept_events FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. Add auto_accepted to emergency_assignments
ALTER TABLE public.emergency_assignments
  ADD COLUMN IF NOT EXISTS auto_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_accept_event_id uuid;

-- 5. Indexes
CREATE INDEX idx_auto_accept_contractor ON public.contractor_auto_accept_settings(contractor_id);
CREATE INDEX idx_capacity_contractor ON public.contractor_capacity_state(contractor_id);
CREATE INDEX idx_auto_accept_events_contractor ON public.contractor_auto_accept_events(contractor_id);
CREATE INDEX idx_auto_accept_events_request ON public.contractor_auto_accept_events(request_id);

-- 6. Triggers
CREATE TRIGGER update_auto_accept_settings_updated_at
  BEFORE UPDATE ON public.contractor_auto_accept_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_capacity_state_updated_at
  BEFORE UPDATE ON public.contractor_capacity_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
