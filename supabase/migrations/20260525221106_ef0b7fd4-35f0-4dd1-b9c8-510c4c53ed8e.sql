ALTER TABLE public.autopilot_runs
  ADD COLUMN IF NOT EXISTS simulation_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS simulated_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'real';

ALTER TABLE public.autopilot_runs
  DROP CONSTRAINT IF EXISTS autopilot_runs_execution_mode_check;
ALTER TABLE public.autopilot_runs
  ADD CONSTRAINT autopilot_runs_execution_mode_check
  CHECK (execution_mode IN ('real','simulation','blocked','pending'));

ALTER TABLE public.outbound_companies
  ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_outbound_companies_is_simulated
  ON public.outbound_companies(is_simulated) WHERE is_simulated = true;