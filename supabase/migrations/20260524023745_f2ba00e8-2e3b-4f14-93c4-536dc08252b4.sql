ALTER TABLE public.painting_estimates
  ADD COLUMN IF NOT EXISTS project_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_method text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS lifespan_years numeric,
  ADD COLUMN IF NOT EXISTS maintenance_level text,
  ADD COLUMN IF NOT EXISTS linear_ft numeric;