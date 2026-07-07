
-- Homeowner memory events (append only)
CREATE TABLE IF NOT EXISTS public.homeowner_memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  source TEXT NOT NULL DEFAULT 'alex',
  question TEXT,
  answer_raw TEXT,
  extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
  scope TEXT NOT NULL CHECK (scope IN ('temporary','long_term')),
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS homeowner_memory_events_user_idx ON public.homeowner_memory_events (user_id, created_at DESC);
GRANT SELECT ON public.homeowner_memory_events TO authenticated;
GRANT ALL ON public.homeowner_memory_events TO service_role;
ALTER TABLE public.homeowner_memory_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homeowner_memory_events' AND policyname='own_homeowner_memory_events') THEN
    CREATE POLICY "own_homeowner_memory_events" ON public.homeowner_memory_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Contractor memory events
CREATE TABLE IF NOT EXISTS public.contractor_memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID,
  source TEXT NOT NULL DEFAULT 'system',
  signal TEXT,
  extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
  scope TEXT NOT NULL CHECK (scope IN ('temporary','long_term')),
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contractor_memory_events_c_idx ON public.contractor_memory_events (contractor_id, created_at DESC);
GRANT SELECT ON public.contractor_memory_events TO authenticated;
GRANT ALL ON public.contractor_memory_events TO service_role;
ALTER TABLE public.contractor_memory_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contractor_memory_events' AND policyname='contractor_memory_events_own') THEN
    CREATE POLICY "contractor_memory_events_own" ON public.contractor_memory_events FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.contractor_members m WHERE m.contractor_id = contractor_memory_events.contractor_id AND m.user_id = auth.uid()));
  END IF;
END $$;

-- Recommendation explanations
CREATE TABLE IF NOT EXISTS public.recommendation_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contractor_id UUID,
  overall_score INT NOT NULL DEFAULT 0,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rec_expl_user_idx ON public.recommendation_explanations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rec_expl_match_idx ON public.recommendation_explanations (match_id);
GRANT SELECT ON public.recommendation_explanations TO authenticated;
GRANT ALL ON public.recommendation_explanations TO service_role;
ALTER TABLE public.recommendation_explanations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recommendation_explanations' AND policyname='own_recommendation_explanations') THEN
    CREATE POLICY "own_recommendation_explanations" ON public.recommendation_explanations FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Adaptive question bank
CREATE TABLE IF NOT EXISTS public.adaptive_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension TEXT NOT NULL,
  question_fr TEXT NOT NULL,
  question_en TEXT,
  answer_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  information_gain NUMERIC NOT NULL DEFAULT 0.5,
  applies_when JSONB NOT NULL DEFAULT '{}'::jsonb,
  updates_fields TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.adaptive_question_bank TO authenticated, anon;
GRANT ALL ON public.adaptive_question_bank TO service_role;
ALTER TABLE public.adaptive_question_bank ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='adaptive_question_bank' AND policyname='read_question_bank') THEN
    CREATE POLICY "read_question_bank" ON public.adaptive_question_bank FOR SELECT TO authenticated, anon USING (is_active = true);
  END IF;
END $$;
