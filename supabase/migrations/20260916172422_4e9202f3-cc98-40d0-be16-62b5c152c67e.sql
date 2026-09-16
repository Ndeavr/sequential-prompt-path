-- 1. Internal traffic marking on funnel events
ALTER TABLE public.contractor_funnel_events
  ADD COLUMN IF NOT EXISTS internal_reason text;

CREATE INDEX IF NOT EXISTS contractor_funnel_events_internal_idx
  ON public.contractor_funnel_events (internal_reason)
  WHERE internal_reason IS NOT NULL;

-- 2. Internal actors registry (admin managed)
CREATE TABLE IF NOT EXISTS public.funnel_internal_actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  phone text,
  company_name text,
  reason text NOT NULL DEFAULT 'internal_actor',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_internal_actors TO authenticated;
GRANT ALL ON public.funnel_internal_actors TO service_role;

ALTER TABLE public.funnel_internal_actors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage internal actors" ON public.funnel_internal_actors;
CREATE POLICY "Admins manage internal actors"
  ON public.funnel_internal_actors
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.funnel_internal_actors_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS funnel_internal_actors_touch_trg ON public.funnel_internal_actors;
CREATE TRIGGER funnel_internal_actors_touch_trg
  BEFORE UPDATE ON public.funnel_internal_actors
  FOR EACH ROW EXECUTE FUNCTION public.funnel_internal_actors_touch();

-- 3. Real-traffic view (excludes QA + internal)
CREATE OR REPLACE VIEW public.v_contractor_funnel_real
WITH (security_invoker = true) AS
SELECT *
FROM public.contractor_funnel_events
WHERE coalesce(is_test, false) = false
  AND internal_reason IS NULL;

GRANT SELECT ON public.v_contractor_funnel_real TO authenticated;
GRANT SELECT ON public.v_contractor_funnel_real TO service_role;

-- 4. Checkout reconciliation status
ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS reconciliation_status text
    NOT NULL DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciliation_note text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checkout_sessions_reconciliation_status_chk'
  ) THEN
    ALTER TABLE public.checkout_sessions
      ADD CONSTRAINT checkout_sessions_reconciliation_status_chk
      CHECK (reconciliation_status IN ('counted','not_counted_zero','needs_review','paid','expired'));
  END IF;
END $$;

-- Existing rows: zero-dollar or provider-less sessions are never purchase intent.
UPDATE public.checkout_sessions
SET reconciliation_status = 'not_counted_zero',
    reconciliation_note = 'montant nul ou identifiant Stripe absent',
    reconciled_at = now()
WHERE reconciliation_status = 'needs_review'
  AND (
    coalesce(final_total_after_discount, 0) <= 0
    OR external_checkout_id IS NULL
    OR btrim(external_checkout_id) = ''
  );

UPDATE public.checkout_sessions
SET reconciliation_status = 'counted'
WHERE reconciliation_status = 'needs_review'
  AND coalesce(final_total_after_discount, 0) > 0
  AND external_checkout_id IS NOT NULL
  AND checkout_status = 'paid';