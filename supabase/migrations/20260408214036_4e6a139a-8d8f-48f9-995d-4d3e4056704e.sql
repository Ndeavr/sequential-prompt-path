
-- user_context_memory
CREATE TABLE IF NOT EXISTS public.user_context_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_intent TEXT,
  budget_range TEXT,
  urgency TEXT,
  preferred_category TEXT,
  last_session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_context_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own context" ON public.user_context_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- property_context
CREATE TABLE IF NOT EXISTS public.property_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  address TEXT,
  city TEXT,
  property_type TEXT,
  year_built INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own properties" ON public.property_context FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- matchmaking_results
CREATE TABLE IF NOT EXISTS public.matchmaking_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_type TEXT,
  contractor_id UUID REFERENCES public.contractors(id),
  score NUMERIC,
  reason TEXT,
  city TEXT,
  urgency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.matchmaking_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own matches" ON public.matchmaking_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts matches" ON public.matchmaking_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- booking_intents
CREATE TABLE IF NOT EXISTS public.booking_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contractor_id UUID REFERENCES public.contractors(id),
  session_id UUID,
  datetime TIMESTAMPTZ,
  service_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookings" ON public.booking_intents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
