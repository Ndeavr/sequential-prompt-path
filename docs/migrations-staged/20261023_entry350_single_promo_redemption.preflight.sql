-- READ ONLY. Run only on an independently identified authorized target.
-- No row identifiers, customer data, provider calls or writes.
SELECT current_database(), current_user;

SELECT i.indexname, i.indexdef, x.indisunique, x.indisvalid, x.indisready
FROM pg_indexes i
JOIN pg_namespace n ON n.nspname = i.schemaname
JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = i.indexname
JOIN pg_index x ON x.indexrelid = c.oid
WHERE i.schemaname = 'public' AND i.tablename = 'contractor_activation_ledger';

SELECT count(*) AS duplicate_promo_groups
FROM (
  SELECT metadata->>'promo_code_id'
  FROM public.contractor_activation_ledger
  WHERE action = 'entry_activation_350_paid'
    AND COALESCE(metadata->>'promo_code_id', '') <> ''
  GROUP BY metadata->>'promo_code_id'
  HAVING count(*) > 1
) duplicates;

SELECT count(*) AS promo_receipts
FROM public.contractor_activation_ledger
WHERE action = 'entry_activation_350_paid'
  AND COALESCE(metadata->>'promo_code_id', '') <> '';

SELECT gated, operational_score FROM public.outreach_autopilot_gate WHERE id = '1';