-- PREPARED ONLY: DO NOT EXECUTE without separate rollback authorization.
-- Prerequisites outside SQL: PROMO TEST/LIVE disabled, no open promo sessions,
-- no in-flight or retryable promo webhooks, workers quiesced, backup verified.
-- Never reset Stripe redemption counters or delete receipts/customer rights.
-- This conservative rollback refuses ALL promo history, even a single TEST row.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';
LOCK TABLE public.contractor_activation_ledger IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE target regclass := to_regclass('public.uq_entry350_single_promo_redemption');
BEGIN
  IF target IS NULL THEN RAISE EXCEPTION 'STOP: expected promo index is absent'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.contractor_activation_ledger
    WHERE action = 'entry_activation_350_paid'
      AND COALESCE(metadata->>'promo_code_id', '') <> ''
  ) THEN RAISE EXCEPTION 'STOP: promo receipts exist; retain protection and use forward repair'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_index
    WHERE indexrelid = target
      AND indrelid = 'public.contractor_activation_ledger'::regclass
      AND indisunique AND indisvalid AND indisready
      AND pg_get_indexdef(target) = 'CREATE UNIQUE INDEX uq_entry350_single_promo_redemption ON public.contractor_activation_ledger USING btree (((metadata ->> ''promo_code_id''::text))) WHERE ((action = ''entry_activation_350_paid''::text) AND (COALESCE((metadata ->> ''promo_code_id''::text), ''''::text) <> ''''::text))'
  ) THEN RAISE EXCEPTION 'STOP: index definition/state mismatch'; END IF;
END $$;
DROP INDEX public.uq_entry350_single_promo_redemption;
COMMIT;