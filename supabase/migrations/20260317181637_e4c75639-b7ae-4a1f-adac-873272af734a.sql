
-- =============================================
-- EMERGENCY ENGINE V2 + STORM MODE SCHEMA
-- =============================================

-- Emergency Requests
CREATE TABLE public.emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'autre',
  severity text NOT NULL DEFAULT 'medium',
  urgency_level text NOT NULL DEFAULT 'medium',
  triage_summary text,
  triage_json jsonb DEFAULT '{}'::jsonb,
  intent_score integer NOT NULL DEFAULT 0,
  photo_urls text[] DEFAULT '{}',
  description text,
  when_started text,
  getting_worse boolean DEFAULT false,
  address text,
  phone text,
  preferred_contact text DEFAULT 'chat',
  asap_requested boolean DEFAULT false,
  callback_requested boolean DEFAULT false,
  dispatch_mode text DEFAULT 'sequential',
  dispatch_delay_seconds integer DEFAULT 300,
  current_dispatch_index integer DEFAULT 0,
  next_dispatch_at timestamptz,
  sla_first_dispatch_due_at timestamptz,
  sla_response_due_at timestamptz,
  sla_accept_due_at timestamptz,
  sla_status text DEFAULT 'on_track',
  storm_related boolean DEFAULT false,
  storm_pattern text,
  storm_priority_score numeric DEFAULT 0,
  storm_session_id uuid,
  shortage_zone boolean DEFAULT false,
  widened_radius_used boolean DEFAULT false,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Emergency Matches
CREATE TABLE public.emergency_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  match_score numeric NOT NULL DEFAULT 0,
  dispatch_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  responded_at timestamptz,
  refusal_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Emergency Events (analytics/timeline)
CREATE TABLE public.emergency_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Emergency Assignments (contractor accepted)
CREATE TABLE public.emergency_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  accepted_at timestamptz DEFAULT now(),
  eta_minutes integer,
  status text NOT NULL DEFAULT 'accepted',
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Emergency Status Events (ETA/status timeline)
CREATE TABLE public.emergency_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.emergency_assignments(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Storm Mode Sessions
CREATE TABLE public.storm_mode_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  activation_type text NOT NULL DEFAULT 'manual',
  scope_type text NOT NULL DEFAULT 'province',
  scope_values text[] DEFAULT '{}',
  severity_level text NOT NULL DEFAULT 'elevated',
  categories text[] DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  auto_expire boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Demand Spike Metrics
CREATE TABLE public.demand_spike_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text,
  city text,
  category text,
  request_count_hour integer DEFAULT 0,
  active_queue_count integer DEFAULT 0,
  available_contractors integer DEFAULT 0,
  acceptance_rate numeric DEFAULT 0,
  avg_response_seconds numeric DEFAULT 0,
  shortage_state text DEFAULT 'balanced',
  calculated_at timestamptz NOT NULL DEFAULT now()
);

-- Dispatch Rules
CREATE TABLE public.dispatch_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  rule_key text NOT NULL,
  rule_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  description_fr text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Storm Rules (auto-activation)
CREATE TABLE public.storm_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text,
  region text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable realtime for emergency tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_status_events;

-- Indexes
CREATE INDEX idx_emergency_requests_status ON public.emergency_requests(status);
CREATE INDEX idx_emergency_requests_user ON public.emergency_requests(user_id);
CREATE INDEX idx_emergency_requests_created ON public.emergency_requests(created_at DESC);
CREATE INDEX idx_emergency_matches_request ON public.emergency_matches(request_id);
CREATE INDEX idx_emergency_matches_contractor ON public.emergency_matches(contractor_id);
CREATE INDEX idx_emergency_assignments_request ON public.emergency_assignments(request_id);
CREATE INDEX idx_storm_sessions_status ON public.storm_mode_sessions(status);

-- RLS
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_mode_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_spike_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies: emergency_requests
CREATE POLICY "Users can view own emergency requests" ON public.emergency_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create emergency requests" ON public.emergency_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update emergency requests" ON public.emergency_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: emergency_matches
CREATE POLICY "Contractors see their matches" ON public.emergency_matches FOR SELECT TO authenticated USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage matches" ON public.emergency_matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: emergency_events
CREATE POLICY "Admins view events" ON public.emergency_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts events" ON public.emergency_events FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies: emergency_assignments
CREATE POLICY "Involved parties view assignments" ON public.emergency_assignments FOR SELECT TO authenticated USING (
  contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
  OR request_id IN (SELECT id FROM public.emergency_requests WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins manage assignments" ON public.emergency_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: emergency_status_events
CREATE POLICY "Involved view status" ON public.emergency_status_events FOR SELECT TO authenticated USING (
  assignment_id IN (SELECT id FROM public.emergency_assignments WHERE contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Contractors update status" ON public.emergency_status_events FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies: admin-only tables
CREATE POLICY "Admins manage storm sessions" ON public.storm_mode_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view demand metrics" ON public.demand_spike_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage dispatch rules" ON public.dispatch_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage storm rules" ON public.storm_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
