
-- AI Coach Contractor tables

CREATE TABLE public.contractor_coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  session_type text NOT NULL DEFAULT 'general',
  current_context jsonb DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE public.contractor_coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.contractor_coach_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message_text text NOT NULL,
  structured_context_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contractor_coach_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  title text NOT NULL,
  description text,
  impact_aipp text,
  impact_rank text,
  impact_routing text,
  impact_badges text,
  cta_label text,
  cta_target text,
  status text NOT NULL DEFAULT 'active',
  confidence_score numeric DEFAULT 0.8,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contractor_coach_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  nudge_type text NOT NULL,
  title text NOT NULL,
  message text,
  priority text DEFAULT 'medium',
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  trigger_context_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contractor_coach_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  key text NOT NULL,
  value_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contractor_id, key)
);

CREATE TABLE public.contractor_coach_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  summary text,
  severity text DEFAULT 'info',
  related_action_codes jsonb,
  related_badges jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.contractor_coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_coach_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_coach_nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_coach_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_coach_insights ENABLE ROW LEVEL SECURITY;

-- Contractor can manage their own coach data
CREATE POLICY "contractor_coach_sessions_own" ON public.contractor_coach_sessions FOR ALL TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "contractor_coach_messages_own" ON public.contractor_coach_messages FOR ALL TO authenticated
  USING (session_id IN (SELECT id FROM public.contractor_coach_sessions WHERE contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())))
  WITH CHECK (session_id IN (SELECT id FROM public.contractor_coach_sessions WHERE contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())));

CREATE POLICY "contractor_coach_recommendations_own" ON public.contractor_coach_recommendations FOR ALL TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "contractor_coach_nudges_own" ON public.contractor_coach_nudges FOR ALL TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "contractor_coach_memory_own" ON public.contractor_coach_memory FOR ALL TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "contractor_coach_insights_own" ON public.contractor_coach_insights FOR ALL TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Admin policies
CREATE POLICY "admin_coach_sessions" ON public.contractor_coach_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_coach_messages" ON public.contractor_coach_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_coach_recommendations" ON public.contractor_coach_recommendations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_coach_nudges" ON public.contractor_coach_nudges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_coach_memory" ON public.contractor_coach_memory FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_coach_insights" ON public.contractor_coach_insights FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_coach_sessions_contractor ON public.contractor_coach_sessions(contractor_id);
CREATE INDEX idx_coach_messages_session ON public.contractor_coach_messages(session_id);
CREATE INDEX idx_coach_recs_contractor ON public.contractor_coach_recommendations(contractor_id);
CREATE INDEX idx_coach_nudges_contractor ON public.contractor_coach_nudges(contractor_id, is_read);
CREATE INDEX idx_coach_memory_contractor ON public.contractor_coach_memory(contractor_id);
CREATE INDEX idx_coach_insights_contractor ON public.contractor_coach_insights(contractor_id);
