
-- alex_prompt_rules (new)
CREATE TABLE IF NOT EXISTS public.alex_prompt_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_key TEXT NOT NULL UNIQUE,
  rule_label TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'system',
  rule_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_prompt_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_rules" ON public.alex_prompt_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_rules" ON public.alex_prompt_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- alex_conversation_sessions (new)
CREATE TABLE IF NOT EXISTS public.alex_conversation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_status TEXT NOT NULL DEFAULT 'active',
  preferred_language TEXT NOT NULL DEFAULT 'fr-CA',
  active_address_id UUID,
  active_property_type TEXT,
  detected_role TEXT,
  current_intent TEXT,
  current_problem_summary TEXT,
  selected_contractor_id UUID,
  selected_booking_slot JSONB,
  conversation_memory_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_conversation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_conv" ON public.alex_conversation_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_create_own_conv" ON public.alex_conversation_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_conv" ON public.alex_conversation_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "anon_create_conv" ON public.alex_conversation_sessions FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "admin_read_all_conv" ON public.alex_conversation_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_alex_conv_sess_user ON public.alex_conversation_sessions(user_id);

-- alex_problem_assessments (new)
CREATE TABLE IF NOT EXISTS public.alex_problem_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_session_id UUID NOT NULL REFERENCES public.alex_conversation_sessions(id) ON DELETE CASCADE,
  symptom_label TEXT,
  probable_problem TEXT,
  recommended_trade TEXT,
  urgency_level TEXT DEFAULT 'normal',
  requires_photo BOOLEAN DEFAULT false,
  requires_address BOOLEAN DEFAULT false,
  requires_login BOOLEAN DEFAULT false,
  assessment_confidence NUMERIC(4,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_problem_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_assess" ON public.alex_problem_assessments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.alex_conversation_sessions s WHERE s.id = conversation_session_id AND s.user_id = auth.uid())
);
CREATE POLICY "insert_assess" ON public.alex_problem_assessments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_read_assess" ON public.alex_problem_assessments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- alex_recommendation_decisions (new)
CREATE TABLE IF NOT EXISTS public.alex_recommendation_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_session_id UUID NOT NULL REFERENCES public.alex_conversation_sessions(id) ON DELETE CASCADE,
  contractor_id UUID,
  is_primary_match BOOLEAN DEFAULT true,
  compatibility_score NUMERIC(5,2),
  availability_score NUMERIC(5,2),
  trust_score NUMERIC(5,2),
  reason_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_recommendation_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_reco" ON public.alex_recommendation_decisions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.alex_conversation_sessions s WHERE s.id = conversation_session_id AND s.user_id = auth.uid())
);
CREATE POLICY "insert_reco" ON public.alex_recommendation_decisions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_read_reco" ON public.alex_recommendation_decisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- alex_booking_candidates (new)
CREATE TABLE IF NOT EXISTS public.alex_booking_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_session_id UUID NOT NULL REFERENCES public.alex_conversation_sessions(id) ON DELETE CASCADE,
  contractor_id UUID,
  slot_start_at TIMESTAMPTZ,
  slot_end_at TIMESTAMPTZ,
  slot_type TEXT DEFAULT 'estimation',
  slot_status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_booking_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_booking" ON public.alex_booking_candidates FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.alex_conversation_sessions s WHERE s.id = conversation_session_id AND s.user_id = auth.uid())
);
CREATE POLICY "users_update_own_booking" ON public.alex_booking_candidates FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.alex_conversation_sessions s WHERE s.id = conversation_session_id AND s.user_id = auth.uid())
);
CREATE POLICY "insert_booking" ON public.alex_booking_candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_read_booking" ON public.alex_booking_candidates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- alex_policy_violations (new)
CREATE TABLE IF NOT EXISTS public.alex_policy_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_session_id UUID REFERENCES public.alex_conversation_sessions(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL,
  detected_text TEXT,
  corrected_text TEXT,
  severity TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_policy_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_violations" ON public.alex_policy_violations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert_violations" ON public.alex_policy_violations FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_alex_prompt_rules_ts BEFORE UPDATE ON public.alex_prompt_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alex_conv_sessions_ts BEFORE UPDATE ON public.alex_conversation_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
