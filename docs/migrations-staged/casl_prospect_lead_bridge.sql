-- ============================================================
-- UNPRO — CASL Prospect ↔ Lead Bridge (STAGED — NOT YET APPLIED)
-- ============================================================
-- Purpose: link CASL evidence captured on contractor_prospects to the
-- matching contractor_lead by normalized phone, Google place_id, or domain.
-- Never deletes rows. Preserves existing IDs and FKs. Logs row counts to
-- platform_operation_outcomes.
--
-- IMPORTANT — this file is a staged SQL body for review only. To apply,
-- the agent MUST invoke supabase--migration with this body only after
-- runPoolerPreflight() returns postgres=true. Never copy this file into
-- supabase/migrations/ — the migration tool creates the file itself.
--
-- Rollback: see rollback_casl_prospect_lead_bridge.sql
-- ============================================================

BEGIN;

-- 1) Columns (additive, non-destructive)
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS source_prospect_id uuid,
  ADD COLUMN IF NOT EXISTS source_company_id  uuid;

-- 2) Foreign keys — only when target table exists and FK not already present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='contractor_prospects')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conname='contractor_leads_source_prospect_fk') THEN
    ALTER TABLE public.contractor_leads
      ADD CONSTRAINT contractor_leads_source_prospect_fk
      FOREIGN KEY (source_prospect_id)
      REFERENCES public.contractor_prospects(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='outbound_companies')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conname='contractor_leads_source_company_fk') THEN
    ALTER TABLE public.contractor_leads
      ADD CONSTRAINT contractor_leads_source_company_fk
      FOREIGN KEY (source_company_id)
      REFERENCES public.outbound_companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Uniqueness — prevent double-bridging a prospect to multiple leads
CREATE UNIQUE INDEX IF NOT EXISTS ux_contractor_leads_source_prospect
  ON public.contractor_leads(source_prospect_id)
  WHERE source_prospect_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contractor_leads_source_company
  ON public.contractor_leads(source_company_id)
  WHERE source_company_id IS NOT NULL;

-- 4) Backfill — phone match (normalized digits only)
WITH phone_match AS (
  SELECT DISTINCT ON (l.id) l.id AS lead_id, p.id AS prospect_id
  FROM public.contractor_leads l
  JOIN public.contractor_prospects p
    ON regexp_replace(coalesce(l.phone, ''), '\D', '', 'g')
     = regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')
   AND length(regexp_replace(coalesce(l.phone, ''), '\D', '', 'g')) >= 10
  WHERE l.source_prospect_id IS NULL
  ORDER BY l.id, p.created_at ASC
),
phone_upd AS (
  UPDATE public.contractor_leads l
  SET source_prospect_id = pm.prospect_id
  FROM phone_match pm
  WHERE l.id = pm.lead_id
    AND NOT EXISTS (
      SELECT 1 FROM public.contractor_leads l2
      WHERE l2.source_prospect_id = pm.prospect_id AND l2.id <> l.id
    )
  RETURNING l.id
)
INSERT INTO public.platform_operation_outcomes(operation, outcome, meta)
SELECT 'casl_bridge_backfill_phone', 'ok',
       jsonb_build_object('rows', (SELECT count(*) FROM phone_upd), 'ts', now());

-- 5) Backfill — place_id match (guarded)
DO $$
DECLARE
  has_l boolean; has_p boolean; n integer := 0;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contractor_leads' AND column_name='google_place_id')
    INTO has_l;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contractor_prospects' AND column_name='google_place_id')
    INTO has_p;
  IF has_l AND has_p THEN
    WITH m AS (
      SELECT DISTINCT ON (l.id) l.id AS lead_id, p.id AS prospect_id
      FROM public.contractor_leads l
      JOIN public.contractor_prospects p
        ON l.google_place_id IS NOT NULL AND l.google_place_id = p.google_place_id
      WHERE l.source_prospect_id IS NULL
      ORDER BY l.id, p.created_at ASC
    )
    UPDATE public.contractor_leads l
    SET source_prospect_id = m.prospect_id
    FROM m WHERE l.id = m.lead_id
      AND NOT EXISTS (SELECT 1 FROM public.contractor_leads l2
                      WHERE l2.source_prospect_id = m.prospect_id AND l2.id <> l.id);
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  INSERT INTO public.platform_operation_outcomes(operation, outcome, meta)
  VALUES ('casl_bridge_backfill_place_id',
          CASE WHEN has_l AND has_p THEN 'ok' ELSE 'skipped' END,
          jsonb_build_object('rows', n, 'ts', now()));
END $$;

-- 6) Backfill — domain match (guarded)
DO $$
DECLARE
  has_l boolean; has_p boolean; n integer := 0;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contractor_leads' AND column_name='domain') INTO has_l;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contractor_prospects' AND column_name='domain') INTO has_p;
  IF has_l AND has_p THEN
    WITH m AS (
      SELECT DISTINCT ON (l.id) l.id AS lead_id, p.id AS prospect_id
      FROM public.contractor_leads l
      JOIN public.contractor_prospects p
        ON lower(nullif(l.domain,'')) = lower(nullif(p.domain,''))
      WHERE l.source_prospect_id IS NULL
      ORDER BY l.id, p.created_at ASC
    )
    UPDATE public.contractor_leads l
    SET source_prospect_id = m.prospect_id
    FROM m WHERE l.id = m.lead_id
      AND NOT EXISTS (SELECT 1 FROM public.contractor_leads l2
                      WHERE l2.source_prospect_id = m.prospect_id AND l2.id <> l.id);
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  INSERT INTO public.platform_operation_outcomes(operation, outcome, meta)
  VALUES ('casl_bridge_backfill_domain',
          CASE WHEN has_l AND has_p THEN 'ok' ELSE 'skipped' END,
          jsonb_build_object('rows', n, 'ts', now()));
END $$;

-- 7) Final tally
INSERT INTO public.platform_operation_outcomes(operation, outcome, meta)
SELECT 'casl_bridge_backfill_summary', 'ok',
       jsonb_build_object(
         'bridged_prospect', (SELECT count(*) FROM public.contractor_leads WHERE source_prospect_id IS NOT NULL),
         'bridged_company',  (SELECT count(*) FROM public.contractor_leads WHERE source_company_id  IS NOT NULL),
         'unbridged',        (SELECT count(*) FROM public.contractor_leads WHERE source_prospect_id IS NULL AND source_company_id IS NULL),
         'ts', now());

COMMIT;
