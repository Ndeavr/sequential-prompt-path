
-- Sessions
CREATE TABLE IF NOT EXISTS public.alex_qualification_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id uuid,
  service_category text,
  graph jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  ready_for_match boolean NOT NULL DEFAULT false,
  matching_confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alex_qualification_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.alex_qualification_sessions TO anon;
GRANT ALL ON public.alex_qualification_sessions TO service_role;
ALTER TABLE public.alex_qualification_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qualification_sessions_own" ON public.alex_qualification_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "qualification_sessions_guest_insert" ON public.alex_qualification_sessions
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "qualification_sessions_guest_read" ON public.alex_qualification_sessions
  FOR SELECT TO anon USING (user_id IS NULL);
CREATE POLICY "qualification_sessions_guest_update" ON public.alex_qualification_sessions
  FOR UPDATE TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- Turns
CREATE TABLE IF NOT EXISTS public.alex_qualification_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.alex_qualification_sessions(id) ON DELETE CASCADE,
  question_asked text,
  user_answer text,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_delta integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.alex_qualification_turns TO authenticated;
GRANT SELECT, INSERT ON public.alex_qualification_turns TO anon;
GRANT ALL ON public.alex_qualification_turns TO service_role;
ALTER TABLE public.alex_qualification_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qualification_turns_session_scope" ON public.alex_qualification_turns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.alex_qualification_sessions s
      WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
  );
CREATE POLICY "qualification_turns_insert" ON public.alex_qualification_turns
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.alex_qualification_sessions s
      WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
  );
CREATE INDEX IF NOT EXISTS idx_qualification_turns_session ON public.alex_qualification_turns(session_id);

-- Homeowner Qualification Graph (long-term moat)
CREATE TABLE IF NOT EXISTS public.homeowner_qualification_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid,
  session_id uuid REFERENCES public.alex_qualification_sessions(id) ON DELETE SET NULL,
  problem_category text,
  symptoms jsonb NOT NULL DEFAULT '{}'::jsonb,
  budget_band text,
  urgency text,
  quotes_count integer DEFAULT 0,
  contractor_id uuid,
  outcome text,
  satisfaction integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homeowner_qualification_graph TO authenticated;
GRANT ALL ON public.homeowner_qualification_graph TO service_role;
ALTER TABLE public.homeowner_qualification_graph ENABLE ROW LEVEL SECURITY;
CREATE POLICY "graph_admin_read" ON public.homeowner_qualification_graph
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_alex_qualification_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS trg_alex_qualification_sessions_updated_at ON public.alex_qualification_sessions;
CREATE TRIGGER trg_alex_qualification_sessions_updated_at
  BEFORE UPDATE ON public.alex_qualification_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_alex_qualification_sessions_updated_at();
