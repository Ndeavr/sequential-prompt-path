
-- Adaptive Frequency Scores: cluster opportunity scoring for dynamic agent cadence
CREATE TABLE IF NOT EXISTS public.adaptive_frequency_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_key text NOT NULL,
  cluster_type text NOT NULL DEFAULT 'city_category',
  city text,
  category text,
  profession text,
  demand_score numeric NOT NULL DEFAULT 0,
  supply_score numeric NOT NULL DEFAULT 0,
  profitability_score numeric NOT NULL DEFAULT 0,
  content_quality_score numeric NOT NULL DEFAULT 0,
  seo_potential_score numeric NOT NULL DEFAULT 0,
  opportunity_score numeric GENERATED ALWAYS AS (
    ROUND((demand_score * 0.25 + supply_score * 0.15 + profitability_score * 0.25 + content_quality_score * 0.15 + seo_potential_score * 0.20), 2)
  ) STORED,
  frequency_multiplier numeric NOT NULL DEFAULT 1.0,
  recommended_action text,
  agent_key text,
  is_active boolean NOT NULL DEFAULT true,
  computed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_key)
);

-- Add adaptive frequency columns to automation_agents
ALTER TABLE public.automation_agents
  ADD COLUMN IF NOT EXISTS adaptive_frequency_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS base_frequency_value integer,
  ADD COLUMN IF NOT EXISTS current_frequency_multiplier numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS error_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_pause_threshold integer DEFAULT 5;

-- RLS
ALTER TABLE public.adaptive_frequency_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on adaptive_frequency_scores"
  ON public.adaptive_frequency_scores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_adaptive_freq_cluster_key ON public.adaptive_frequency_scores(cluster_key);
CREATE INDEX IF NOT EXISTS idx_adaptive_freq_opportunity ON public.adaptive_frequency_scores(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_adaptive_freq_agent ON public.adaptive_frequency_scores(agent_key);

-- Updated_at trigger
CREATE TRIGGER update_adaptive_frequency_scores_updated_at
  BEFORE UPDATE ON public.adaptive_frequency_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
