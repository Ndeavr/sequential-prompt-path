
-- Animation presets
CREATE TABLE public.contractor_animation_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_code text NOT NULL UNIQUE,
  preset_label text NOT NULL,
  delay_before_line_ms integer NOT NULL DEFAULT 300,
  typing_speed_chars_per_sec integer NOT NULL DEFAULT 40,
  hold_after_line_ms integer NOT NULL DEFAULT 200,
  stage_transition_ms integer NOT NULL DEFAULT 800,
  reveal_card_delay_ms integer NOT NULL DEFAULT 600,
  reveal_score_delay_ms integer NOT NULL DEFAULT 1200,
  reveal_plan_delay_ms integer NOT NULL DEFAULT 1500,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_animation_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read presets" ON public.contractor_animation_presets FOR SELECT USING (true);
CREATE POLICY "Admins manage presets" ON public.contractor_animation_presets FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Animation sessions
CREATE TABLE public.contractor_animation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  import_job_id uuid REFERENCES public.contractor_import_jobs(id) ON DELETE SET NULL,
  preset_code text NOT NULL DEFAULT 'balanced_default' REFERENCES public.contractor_animation_presets(preset_code),
  speed_mode text NOT NULL DEFAULT 'normal',
  current_stage text NOT NULL DEFAULT 'queued',
  total_steps integer NOT NULL DEFAULT 0,
  emitted_steps integer NOT NULL DEFAULT 0,
  percent_complete numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_animation_sessions_contractor ON public.contractor_animation_sessions(contractor_id);
CREATE INDEX idx_animation_sessions_status ON public.contractor_animation_sessions(status);

ALTER TABLE public.contractor_animation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors view own sessions" ON public.contractor_animation_sessions FOR SELECT USING (public.owns_contractor(contractor_id));
CREATE POLICY "Admins manage sessions" ON public.contractor_animation_sessions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System insert sessions" ON public.contractor_animation_sessions FOR INSERT WITH CHECK (public.owns_contractor(contractor_id));

-- Animation events
CREATE TABLE public.contractor_animation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animation_session_id uuid NOT NULL REFERENCES public.contractor_animation_sessions(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  import_job_id uuid REFERENCES public.contractor_import_jobs(id) ON DELETE SET NULL,
  event_code text NOT NULL,
  event_label text NOT NULL,
  event_type text NOT NULL DEFAULT 'info',
  stage_code text NOT NULL DEFAULT 'boot',
  payload_json jsonb DEFAULT '{}'::jsonb,
  display_text text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  reveal_card_code text,
  delay_before_line_ms integer,
  typing_speed_chars_per_sec integer,
  hold_after_line_ms integer,
  sequence_order integer NOT NULL DEFAULT 0,
  emitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_animation_events_session ON public.contractor_animation_events(animation_session_id);
CREATE INDEX idx_animation_events_order ON public.contractor_animation_events(animation_session_id, sequence_order);

ALTER TABLE public.contractor_animation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors view own events" ON public.contractor_animation_events FOR SELECT USING (public.owns_contractor(contractor_id));
CREATE POLICY "Admins manage events" ON public.contractor_animation_events FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System insert events" ON public.contractor_animation_events FOR INSERT WITH CHECK (public.owns_contractor(contractor_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_animation_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_animation_sessions;

-- Seed presets
INSERT INTO public.contractor_animation_presets (preset_code, preset_label, delay_before_line_ms, typing_speed_chars_per_sec, hold_after_line_ms, stage_transition_ms, reveal_card_delay_ms, reveal_score_delay_ms, reveal_plan_delay_ms, is_default) VALUES
  ('cinematic_slow', 'Cinématique (lent)', 500, 28, 400, 1200, 900, 1800, 2200, false),
  ('balanced_default', 'Équilibré (défaut)', 300, 40, 200, 800, 600, 1200, 1500, true),
  ('fast_demo', 'Démo rapide', 100, 80, 80, 300, 200, 400, 500, false);
