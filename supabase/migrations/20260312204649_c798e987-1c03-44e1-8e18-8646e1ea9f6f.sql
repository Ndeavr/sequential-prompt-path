
-- Add completion tracking columns to syndicate_projects
ALTER TABLE public.syndicate_projects
  ADD COLUMN IF NOT EXISTS actual_cost integer,
  ADD COLUMN IF NOT EXISTS actual_contractor_id uuid REFERENCES public.contractors(id),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_rating integer,
  ADD COLUMN IF NOT EXISTS owner_feedback text,
  ADD COLUMN IF NOT EXISTS cost_variance_percent numeric,
  ADD COLUMN IF NOT EXISTS ai_prediction_accuracy numeric;

-- Market price reference table for AI prediction calibration
CREATE TABLE IF NOT EXISTS public.market_price_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  region text NOT NULL DEFAULT 'quebec',
  avg_cost_per_unit integer NOT NULL,
  unit_type text NOT NULL DEFAULT 'sqft',
  sample_count integer DEFAULT 0,
  last_updated_from_actuals timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(component, region)
);

ALTER TABLE public.market_price_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read benchmarks"
  ON public.market_price_benchmarks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role manages benchmarks"
  ON public.market_price_benchmarks FOR ALL
  TO service_role USING (true);

-- Seed initial benchmarks
INSERT INTO public.market_price_benchmarks (component, region, avg_cost_per_unit, unit_type, sample_count) VALUES
  ('Toiture', 'quebec', 35, 'sqft', 12),
  ('Fenêtres', 'quebec', 850, 'unit', 18),
  ('Maçonnerie', 'quebec', 28, 'sqft', 9),
  ('Stationnement', 'quebec', 42, 'sqft', 6),
  ('Ascenseur', 'quebec', 95000, 'unit', 4),
  ('CVAC', 'quebec', 18, 'sqft', 11),
  ('Plomberie', 'quebec', 22, 'sqft', 7),
  ('Électricité', 'quebec', 16, 'sqft', 8),
  ('Balcons', 'quebec', 320, 'linear_ft', 5),
  ('Membrane', 'quebec', 38, 'sqft', 10)
ON CONFLICT (component, region) DO NOTHING;
