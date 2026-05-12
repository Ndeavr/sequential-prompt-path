ALTER TABLE public.activation_pipeline_runs
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS contractor_id uuid;

CREATE INDEX IF NOT EXISTS idx_activation_runs_stripe_session
  ON public.activation_pipeline_runs (stripe_session_id);