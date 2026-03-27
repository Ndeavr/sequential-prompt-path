
-- Voice Experiment System Tables
-- ================================

-- Experiments: A/B tests between voice variants
CREATE TABLE public.alex_voice_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_key text UNIQUE NOT NULL,
  experiment_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  profile_key text NOT NULL DEFAULT 'homeowner',
  language text NOT NULL DEFAULT 'fr',
  locale_code text NOT NULL DEFAULT 'fr-QC',
  start_date timestamptz,
  end_date timestamptz,
  min_sessions_per_variant int NOT NULL DEFAULT 50,
  confidence_threshold numeric NOT NULL DEFAULT 0.95,
  auto_promote boolean NOT NULL DEFAULT false,
  winner_variant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Variants: each voice configuration being tested
CREATE TABLE public.alex_voice_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.alex_voice_experiments(id) ON DELETE CASCADE,
  variant_key text NOT NULL,
  variant_name text NOT NULL,
  provider_key text NOT NULL DEFAULT 'openai_realtime',
  voice_id text,
  voice_name text,
  speech_rate numeric NOT NULL DEFAULT 1.0,
  speech_style text,
  tone_config jsonb DEFAULT '{}'::jsonb,
  traffic_split numeric NOT NULL DEFAULT 50,
  is_control boolean NOT NULL DEFAULT false,
  is_winner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, variant_key)
);

-- Session scores: per-session quality scoring
CREATE TABLE public.alex_voice_session_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id uuid,
  variant_id uuid REFERENCES public.alex_voice_variants(id) ON DELETE SET NULL,
  experiment_id uuid REFERENCES public.alex_voice_experiments(id) ON DELETE SET NULL,
  clarity_score numeric DEFAULT 0,
  fluency_score numeric DEFAULT 0,
  confidence_score numeric DEFAULT 0,
  interruption_count int DEFAULT 0,
  fallback_triggered boolean DEFAULT false,
  conversion_achieved boolean DEFAULT false,
  calendar_opened boolean DEFAULT false,
  session_duration_ms int DEFAULT 0,
  overall_score numeric GENERATED ALWAYS AS (
    (COALESCE(clarity_score, 0) * 0.25) +
    (COALESCE(fluency_score, 0) * 0.25) +
    (COALESCE(confidence_score, 0) * 0.2) +
    (CASE WHEN conversion_achieved THEN 20 ELSE 0 END) +
    (CASE WHEN calendar_opened THEN 10 ELSE 0 END) -
    (COALESCE(interruption_count, 0) * 2)
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Variant aggregate metrics (materialized by trigger or cron)
CREATE TABLE public.alex_voice_variant_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.alex_voice_variants(id) ON DELETE CASCADE,
  experiment_id uuid NOT NULL REFERENCES public.alex_voice_experiments(id) ON DELETE CASCADE,
  total_sessions int NOT NULL DEFAULT 0,
  avg_clarity numeric DEFAULT 0,
  avg_fluency numeric DEFAULT 0,
  avg_confidence numeric DEFAULT 0,
  avg_overall_score numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  calendar_open_rate numeric DEFAULT 0,
  avg_interruptions numeric DEFAULT 0,
  fallback_rate numeric DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant_id)
);

-- Promotion history: track when a variant was promoted
CREATE TABLE public.alex_voice_promotion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.alex_voice_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.alex_voice_variants(id) ON DELETE CASCADE,
  promoted_by text DEFAULT 'system',
  promotion_reason text,
  previous_config jsonb DEFAULT '{}'::jsonb,
  new_config jsonb DEFAULT '{}'::jsonb,
  promoted_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_voice_experiments_status ON public.alex_voice_experiments(status);
CREATE INDEX idx_voice_variants_experiment ON public.alex_voice_variants(experiment_id);
CREATE INDEX idx_voice_session_scores_variant ON public.alex_voice_session_scores(variant_id, created_at DESC);
CREATE INDEX idx_voice_session_scores_experiment ON public.alex_voice_session_scores(experiment_id, created_at DESC);
CREATE INDEX idx_voice_variant_metrics_experiment ON public.alex_voice_variant_metrics(experiment_id);
CREATE INDEX idx_voice_promotion_history_experiment ON public.alex_voice_promotion_history(experiment_id, promoted_at DESC);

-- RLS
ALTER TABLE public.alex_voice_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_session_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_variant_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_promotion_history ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated (admin pages check role client-side)
CREATE POLICY "Authenticated read voice experiments" ON public.alex_voice_experiments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read voice variants" ON public.alex_voice_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read voice session scores" ON public.alex_voice_session_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read voice variant metrics" ON public.alex_voice_variant_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read voice promotion history" ON public.alex_voice_promotion_history FOR SELECT TO authenticated USING (true);

-- Insert for app usage (session scores)
CREATE POLICY "Authenticated insert session scores" ON public.alex_voice_session_scores FOR INSERT TO authenticated WITH CHECK (true);

-- Admin write (all tables)
CREATE POLICY "Admin write voice experiments" ON public.alex_voice_experiments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write voice variants" ON public.alex_voice_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write voice variant metrics" ON public.alex_voice_variant_metrics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write voice promotion history" ON public.alex_voice_promotion_history FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_voice_experiment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_voice_experiments_updated_at
  BEFORE UPDATE ON public.alex_voice_experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_voice_experiment_updated_at();
