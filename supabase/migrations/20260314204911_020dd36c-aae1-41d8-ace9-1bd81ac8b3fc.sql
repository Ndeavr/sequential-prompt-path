
-- Block 4: Extend home_scores, add predictions + neighborhood stats

-- 1. Extend home_scores with confidence, score_type, factor breakdown
ALTER TABLE public.home_scores ADD COLUMN IF NOT EXISTS score_type TEXT DEFAULT 'estimated';
ALTER TABLE public.home_scores ADD COLUMN IF NOT EXISTS confidence_level INTEGER DEFAULT 30;
ALTER TABLE public.home_scores ADD COLUMN IF NOT EXISTS confidence_label TEXT DEFAULT 'faible';
ALTER TABLE public.home_scores ADD COLUMN IF NOT EXISTS factor_breakdown JSONB;
ALTER TABLE public.home_scores ADD COLUMN IF NOT EXISTS maintenance_score NUMERIC DEFAULT 0;
ALTER TABLE public.home_scores ADD COLUMN IF NOT EXISTS data_sources_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_home_scores_property_type ON public.home_scores(property_id, score_type);
CREATE INDEX IF NOT EXISTS idx_home_scores_calculated ON public.home_scores(calculated_at);

-- 2. Property predictions (Digital Twin V1)
CREATE TABLE IF NOT EXISTS public.property_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  explanation_fr TEXT,
  probability_score INTEGER DEFAULT 50,
  predicted_year INTEGER,
  cost_min INTEGER,
  cost_max INTEGER,
  cost_unit TEXT DEFAULT 'CAD',
  source_confidence TEXT DEFAULT 'low',
  urgency TEXT DEFAULT 'medium',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_property ON public.property_predictions(property_id);
CREATE INDEX IF NOT EXISTS idx_predictions_active ON public.property_predictions(is_active);

ALTER TABLE public.property_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own predictions"
  ON public.property_predictions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND (p.user_id = auth.uid() OR p.claimed_by = auth.uid())
    )
  );

CREATE POLICY "Admins can manage predictions"
  ON public.property_predictions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Neighborhood stats cache
CREATE TABLE IF NOT EXISTS public.neighborhood_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_key TEXT NOT NULL,
  area_type TEXT NOT NULL DEFAULT 'city',
  city TEXT,
  neighborhood TEXT,
  street_name TEXT,
  avg_score NUMERIC,
  median_score NUMERIC,
  property_count INTEGER DEFAULT 0,
  active_passports INTEGER DEFAULT 0,
  recent_improvements INTEGER DEFAULT 0,
  top_renovation_types JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(area_key, area_type)
);

CREATE INDEX IF NOT EXISTS idx_neighborhood_stats_area ON public.neighborhood_stats(area_key, area_type);

ALTER TABLE public.neighborhood_stats ENABLE ROW LEVEL SECURITY;

-- Public read for anonymized neighborhood data
CREATE POLICY "Public can view neighborhood stats"
  ON public.neighborhood_stats FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "System can manage neighborhood stats"
  ON public.neighborhood_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
