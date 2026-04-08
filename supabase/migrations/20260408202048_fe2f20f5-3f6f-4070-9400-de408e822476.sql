
-- Table: user_intents
CREATE TABLE public.user_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  raw_input TEXT NOT NULL,
  intent_type TEXT,
  category TEXT,
  urgency_level TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create intents" ON public.user_intents FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own intents" ON public.user_intents FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Table: intent_sessions
CREATE TABLE public.intent_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_status TEXT NOT NULL DEFAULT 'active',
  input_mode TEXT NOT NULL DEFAULT 'text',
  matched_contractor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.intent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create sessions" ON public.intent_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own sessions" ON public.intent_sessions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update own sessions" ON public.intent_sessions FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Table: prediction_matches
CREATE TABLE public.prediction_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intent_id UUID REFERENCES public.user_intents(id) ON DELETE CASCADE,
  contractor_id UUID,
  score NUMERIC DEFAULT 0,
  estimated_price_min NUMERIC,
  estimated_price_max NUMERIC,
  estimated_delay TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.prediction_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read matches" ON public.prediction_matches FOR SELECT USING (true);
CREATE POLICY "System can insert matches" ON public.prediction_matches FOR INSERT WITH CHECK (true);
