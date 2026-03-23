
-- Alex Self Evolution tables

CREATE TABLE public.alex_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  role text,
  context jsonb,
  alex_text text,
  user_response text,
  action_taken text,
  success boolean,
  conversion_type text,
  time_to_action_ms integer,
  friction_detected boolean DEFAULT false,
  emotional_state text,
  session_id text,
  page text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.alex_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  segment text,
  timeframe text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.alex_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_type text NOT NULL,
  experiment_key text NOT NULL,
  variant_a jsonb,
  variant_b jsonb,
  variant_a_conversions integer DEFAULT 0,
  variant_a_impressions integer DEFAULT 0,
  variant_b_conversions integer DEFAULT 0,
  variant_b_impressions integer DEFAULT 0,
  winner text,
  confidence numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE public.alex_learning_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_key text NOT NULL,
  pattern_description text,
  improvement text,
  confidence numeric DEFAULT 0.5,
  applied boolean DEFAULT false,
  applied_at timestamptz,
  reversible boolean DEFAULT true,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_alex_interactions_user ON public.alex_interactions(user_id);
CREATE INDEX idx_alex_interactions_created ON public.alex_interactions(created_at DESC);
CREATE INDEX idx_alex_experiments_active ON public.alex_experiments(is_active) WHERE is_active = true;
CREATE INDEX idx_alex_learning_applied ON public.alex_learning_memory(applied, confidence DESC);

-- RLS
ALTER TABLE public.alex_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_learning_memory ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_alex_interactions" ON public.alex_interactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_alex_perf_metrics" ON public.alex_performance_metrics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_alex_experiments" ON public.alex_experiments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_alex_learning" ON public.alex_learning_memory FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Allow insert for any authenticated user (logging)
CREATE POLICY "insert_alex_interactions" ON public.alex_interactions FOR INSERT TO authenticated WITH CHECK (true);
