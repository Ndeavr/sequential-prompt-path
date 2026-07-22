-- ============================================================
-- UNPRO — Rollback for CASL Prospect ↔ Lead Bridge (STAGED)
-- Non-destructive: only drops the additive structures.
-- ============================================================
BEGIN;

DROP INDEX IF EXISTS public.ux_contractor_leads_source_prospect;
DROP INDEX IF EXISTS public.ux_contractor_leads_source_company;

ALTER TABLE public.contractor_leads
  DROP CONSTRAINT IF EXISTS contractor_leads_source_prospect_fk;
ALTER TABLE public.contractor_leads
  DROP CONSTRAINT IF EXISTS contractor_leads_source_company_fk;

ALTER TABLE public.contractor_leads
  DROP COLUMN IF EXISTS source_prospect_id,
  DROP COLUMN IF EXISTS source_company_id;

INSERT INTO public.platform_operation_outcomes(operation, outcome, meta)
VALUES ('casl_bridge_rollback', 'ok', jsonb_build_object('ts', now()));

COMMIT;
