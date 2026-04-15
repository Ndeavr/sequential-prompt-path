
-- strike_sessions
CREATE TABLE public.strike_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '36 hours'),
  target_conversions INT NOT NULL DEFAULT 1,
  actual_conversions INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','critical','success','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strike_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access strike_sessions" ON public.strike_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- strike_targets
CREATE TABLE public.strike_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.strike_sessions(id) ON DELETE CASCADE,
  contractor_id UUID,
  business_name TEXT,
  city TEXT,
  category TEXT,
  priority_score NUMERIC NOT NULL DEFAULT 0,
  engagement_level TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','hot','converted','lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strike_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access strike_targets" ON public.strike_targets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- strike_events
CREATE TABLE public.strike_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.strike_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email_sent','opened','clicked','replied','alex_triggered','converted','adjustment','error')),
  contractor_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strike_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access strike_events" ON public.strike_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime on strike_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.strike_events;

-- strike_adjustments
CREATE TABLE public.strike_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.strike_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  impact_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strike_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access strike_adjustments" ON public.strike_adjustments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- strike_results
CREATE TABLE public.strike_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.strike_sessions(id) ON DELETE CASCADE,
  total_emails_sent INT NOT NULL DEFAULT 0,
  total_opened INT NOT NULL DEFAULT 0,
  total_clicked INT NOT NULL DEFAULT 0,
  total_replied INT NOT NULL DEFAULT 0,
  total_converted INT NOT NULL DEFAULT 0,
  revenue_generated NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strike_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access strike_results" ON public.strike_results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
