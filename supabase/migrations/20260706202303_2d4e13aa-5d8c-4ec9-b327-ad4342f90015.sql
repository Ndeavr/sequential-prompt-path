
ALTER TABLE public.scan_ia_reports
  ADD COLUMN IF NOT EXISTS company_reveal jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS market_position jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS territory_demand jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS today_jobs_per_month int,
  ADD COLUMN IF NOT EXISTS user_goal text,
  ADD COLUMN IF NOT EXISTS user_capacity int,
  ADD COLUMN IF NOT EXISTS recommended_plan text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_scan_ia_reports_stripe_session
  ON public.scan_ia_reports(stripe_session_id);
