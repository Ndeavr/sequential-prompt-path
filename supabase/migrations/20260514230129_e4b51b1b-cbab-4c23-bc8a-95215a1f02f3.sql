
CREATE TABLE IF NOT EXISTS public.contractor_intake_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  anon_session_id text NULL,
  mode text NOT NULL DEFAULT 'alex' CHECK (mode IN ('alex','form')),
  company_name text,
  website text,
  phone text,
  rbq text,
  detected_trade text,
  detected_region text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary text,
  recommended_plan text,
  projected_revenue_low integer,
  projected_revenue_high integer,
  aipp_score integer,
  completion_percentage integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cis_user ON public.contractor_intake_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cis_anon ON public.contractor_intake_sessions(anon_session_id);

ALTER TABLE public.contractor_intake_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake insert anyone"
  ON public.contractor_intake_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "intake update own"
  ON public.contractor_intake_sessions FOR UPDATE
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR (user_id IS NULL AND anon_session_id IS NOT NULL)
  );

CREATE POLICY "intake select own"
  ON public.contractor_intake_sessions FOR SELECT
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR (user_id IS NULL AND anon_session_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cis_touch ON public.contractor_intake_sessions;
CREATE TRIGGER trg_cis_touch
  BEFORE UPDATE ON public.contractor_intake_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_intake_sessions;
