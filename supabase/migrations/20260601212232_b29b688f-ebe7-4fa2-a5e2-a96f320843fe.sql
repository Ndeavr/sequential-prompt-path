-- Add missing columns to existing contractor_prospects
ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS recommended_plan TEXT,
  ADD COLUMN IF NOT EXISTS recommended_plan_reason TEXT,
  ADD COLUMN IF NOT EXISTS estimated_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_monthly_value NUMERIC,
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_action TEXT;

-- New table for AI-generated message variants pending admin approval
CREATE TABLE IF NOT EXISTS public.contractor_outreach_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
  variant_index INTEGER NOT NULL,
  angle TEXT NOT NULL,
  tone TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  cta TEXT,
  predicted_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','admin_test_sent','approved','rejected','dispatched')),
  admin_test_sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  dispatched_at TIMESTAMPTZ,
  generated_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_outreach_tests_prospect
  ON public.contractor_outreach_tests (prospect_id, channel, variant_index);

CREATE INDEX IF NOT EXISTS idx_contractor_outreach_tests_status
  ON public.contractor_outreach_tests (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_outreach_tests TO authenticated;
GRANT ALL ON public.contractor_outreach_tests TO service_role;

ALTER TABLE public.contractor_outreach_tests ENABLE ROW LEVEL SECURITY;

-- Admin-only access (uses existing has_role helper)
CREATE POLICY "Admins manage outreach tests"
  ON public.contractor_outreach_tests
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at trigger (reuses existing function if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'contractor_outreach_tests_updated_at'
  ) THEN
    CREATE TRIGGER contractor_outreach_tests_updated_at
      BEFORE UPDATE ON public.contractor_outreach_tests
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;