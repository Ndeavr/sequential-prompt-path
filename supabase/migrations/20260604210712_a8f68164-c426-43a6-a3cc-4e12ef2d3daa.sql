
DO $$ BEGIN
  CREATE TYPE public.platform_business_outcome AS ENUM ('achieved','blocked','failed','partial','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.platform_operation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  intent TEXT,
  business_outcome public.platform_business_outcome NOT NULL,
  failure_code TEXT,
  block_reason TEXT,
  affected_record TEXT,
  service TEXT,
  attempt INT NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  revenue_impact_cents BIGINT,
  next_action TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poo_operation_created ON public.platform_operation_outcomes(operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poo_outcome ON public.platform_operation_outcomes(business_outcome, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poo_failure_code ON public.platform_operation_outcomes(failure_code) WHERE failure_code IS NOT NULL;

GRANT SELECT ON public.platform_operation_outcomes TO authenticated;
GRANT ALL ON public.platform_operation_outcomes TO service_role;

ALTER TABLE public.platform_operation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read outcomes"
  ON public.platform_operation_outcomes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role writes outcomes"
  ON public.platform_operation_outcomes
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
