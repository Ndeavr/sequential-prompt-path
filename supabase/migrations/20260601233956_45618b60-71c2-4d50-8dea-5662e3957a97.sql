-- Acquisition system observability tables

CREATE TABLE IF NOT EXISTS public.acquisition_system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unknown',
  error_code text,
  message text,
  missing_secrets text[] DEFAULT ARRAY[]::text[],
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  proposed_fix text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.acquisition_system_health TO authenticated;
GRANT ALL ON public.acquisition_system_health TO service_role;
ALTER TABLE public.acquisition_system_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read system health"
  ON public.acquisition_system_health FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.acquisition_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  status text NOT NULL,
  request_payload jsonb,
  response_payload jsonb,
  error_code text,
  error_message text,
  missing_secrets text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acq_action_logs_created_at
  ON public.acquisition_action_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acq_action_logs_action_status
  ON public.acquisition_action_logs (action, status, created_at DESC);

GRANT SELECT ON public.acquisition_action_logs TO authenticated;
GRANT ALL ON public.acquisition_action_logs TO service_role;
ALTER TABLE public.acquisition_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read action logs"
  ON public.acquisition_action_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));