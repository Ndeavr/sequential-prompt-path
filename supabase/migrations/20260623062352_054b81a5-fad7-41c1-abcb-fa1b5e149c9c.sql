
ALTER TABLE public.acquisition_audit_runs
  ADD COLUMN IF NOT EXISTS confidence_score int,
  ADD COLUMN IF NOT EXISTS system_status text,
  ADD COLUMN IF NOT EXISTS data_availability jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS silent_failures jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS event_counts jsonb DEFAULT '{}'::jsonb;
