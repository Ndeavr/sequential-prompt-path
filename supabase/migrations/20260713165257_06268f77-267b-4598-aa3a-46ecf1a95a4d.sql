
-- 1) Idempotency columns on prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_prospects_stripe_session_id
  ON public.prospects (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_prospects_activation_paid_at
  ON public.prospects (activation_paid_at)
  WHERE activation_paid_at IS NOT NULL;

-- 2) Broaden ledger action CHECK to allow 'paid' rows
ALTER TABLE public.contractor_activation_ledger
  DROP CONSTRAINT IF EXISTS contractor_activation_ledger_action_check;
ALTER TABLE public.contractor_activation_ledger
  ADD CONSTRAINT contractor_activation_ledger_action_check
  CHECK (action = ANY (ARRAY['activated','reactivated','deactivated','noop','paid','repaired']));

-- 3) Grants for contractor_profiles (missing → service role couldn't insert reliably)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_profiles TO authenticated;
GRANT ALL ON public.contractor_profiles TO service_role;
