
BEGIN;

ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS source_prospect_id uuid,
  ADD COLUMN IF NOT EXISTS source_company_id  uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contractor_leads_source_prospect_fk') THEN
    ALTER TABLE public.contractor_leads
      ADD CONSTRAINT contractor_leads_source_prospect_fk
      FOREIGN KEY (source_prospect_id)
      REFERENCES public.contractor_prospects(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='outbound_companies')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contractor_leads_source_company_fk') THEN
    ALTER TABLE public.contractor_leads
      ADD CONSTRAINT contractor_leads_source_company_fk
      FOREIGN KEY (source_company_id)
      REFERENCES public.outbound_companies(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contractor_leads_source_prospect
  ON public.contractor_leads(source_prospect_id)
  WHERE source_prospect_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contractor_leads_source_company
  ON public.contractor_leads(source_company_id)
  WHERE source_company_id IS NOT NULL;

-- One-to-one phone bridge: dedupe on BOTH sides
WITH pairs AS (
  SELECT l.id AS lead_id, p.id AS prospect_id, p.created_at AS p_ts, l.created_at AS l_ts
  FROM public.contractor_leads l
  JOIN public.contractor_prospects p
    ON regexp_replace(coalesce(l.phone, ''), '\D', '', 'g')
     = regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')
   AND length(regexp_replace(coalesce(l.phone, ''), '\D', '', 'g')) >= 10
  WHERE l.source_prospect_id IS NULL
),
one_prospect_per_lead AS (
  SELECT DISTINCT ON (lead_id) lead_id, prospect_id, p_ts, l_ts
  FROM pairs ORDER BY lead_id, p_ts ASC
),
one_lead_per_prospect AS (
  SELECT DISTINCT ON (prospect_id) lead_id, prospect_id
  FROM one_prospect_per_lead ORDER BY prospect_id, l_ts ASC
),
upd AS (
  UPDATE public.contractor_leads l
  SET source_prospect_id = o.prospect_id
  FROM one_lead_per_prospect o
  WHERE l.id = o.lead_id
  RETURNING l.id
)
INSERT INTO public.platform_operation_outcomes(operation, business_outcome, payload)
SELECT 'casl_bridge_backfill_phone', 'achieved',
       jsonb_build_object('rows', (SELECT count(*) FROM upd), 'ts', now());

-- place_id bridge (guarded, dedup-safe)
DO $$
DECLARE has_l boolean; has_p boolean; n integer := 0;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contractor_leads' AND column_name='google_place_id') INTO has_l;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contractor_prospects' AND column_name='google_place_id') INTO has_p;
  IF has_l AND has_p THEN
    WITH pairs AS (
      SELECT l.id AS lead_id, p.id AS prospect_id, p.created_at AS p_ts, l.created_at AS l_ts
      FROM public.contractor_leads l
      JOIN public.contractor_prospects p
        ON l.google_place_id IS NOT NULL AND l.google_place_id = p.google_place_id
      WHERE l.source_prospect_id IS NULL
    ),
    a AS (SELECT DISTINCT ON (lead_id) lead_id, prospect_id, p_ts, l_ts FROM pairs ORDER BY lead_id, p_ts ASC),
    b AS (SELECT DISTINCT ON (prospect_id) lead_id, prospect_id FROM a ORDER BY prospect_id, l_ts ASC)
    UPDATE public.contractor_leads l
    SET source_prospect_id = b.prospect_id
    FROM b WHERE l.id = b.lead_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  INSERT INTO public.platform_operation_outcomes(operation, business_outcome, payload)
  VALUES ('casl_bridge_backfill_place_id',
          CASE WHEN has_l AND has_p THEN 'achieved'::platform_business_outcome ELSE 'blocked'::platform_business_outcome END,
          jsonb_build_object('rows', n, 'ts', now()));
END $$;

-- domain bridge (guarded, dedup-safe)
DO $$
DECLARE has_l boolean; has_p boolean; n integer := 0;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contractor_leads' AND column_name='domain') INTO has_l;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contractor_prospects' AND column_name='domain') INTO has_p;
  IF has_l AND has_p THEN
    WITH pairs AS (
      SELECT l.id AS lead_id, p.id AS prospect_id, p.created_at AS p_ts, l.created_at AS l_ts
      FROM public.contractor_leads l
      JOIN public.contractor_prospects p
        ON lower(nullif(l.domain,'')) = lower(nullif(p.domain,''))
      WHERE l.source_prospect_id IS NULL
    ),
    a AS (SELECT DISTINCT ON (lead_id) lead_id, prospect_id, p_ts, l_ts FROM pairs ORDER BY lead_id, p_ts ASC),
    b AS (SELECT DISTINCT ON (prospect_id) lead_id, prospect_id FROM a ORDER BY prospect_id, l_ts ASC)
    UPDATE public.contractor_leads l
    SET source_prospect_id = b.prospect_id
    FROM b WHERE l.id = b.lead_id;
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  INSERT INTO public.platform_operation_outcomes(operation, business_outcome, payload)
  VALUES ('casl_bridge_backfill_domain',
          CASE WHEN has_l AND has_p THEN 'achieved'::platform_business_outcome ELSE 'blocked'::platform_business_outcome END,
          jsonb_build_object('rows', n, 'ts', now()));
END $$;

-- CASL evidence backfill via linked prospect
WITH ev_by_prospect AS (
  UPDATE public.casl_consent_evidence e
  SET contractor_lead_id = l.id
  FROM public.contractor_leads l
  WHERE e.contractor_lead_id IS NULL
    AND e.contractor_prospect_id IS NOT NULL
    AND l.source_prospect_id = e.contractor_prospect_id
  RETURNING e.id
)
INSERT INTO public.platform_operation_outcomes(operation, business_outcome, payload)
SELECT 'casl_evidence_backfill_lead_via_prospect', 'achieved',
       jsonb_build_object('rows', (SELECT count(*) FROM ev_by_prospect), 'ts', now());

-- CASL evidence backfill via normalized phone
WITH ev_by_phone AS (
  UPDATE public.casl_consent_evidence e
  SET contractor_lead_id = sub.lead_id
  FROM (
    SELECT DISTINCT ON (e2.id) e2.id AS ev_id, l.id AS lead_id
    FROM public.casl_consent_evidence e2
    JOIN public.contractor_leads l
      ON e2.destination_type = 'phone_sms'
     AND regexp_replace(coalesce(l.phone,''), '\D', '', 'g') =
         regexp_replace(coalesce(e2.destination_normalized,''), '\D', '', 'g')
     AND length(regexp_replace(coalesce(l.phone,''), '\D', '', 'g')) >= 10
    WHERE e2.contractor_lead_id IS NULL
    ORDER BY e2.id, l.created_at ASC
  ) sub
  WHERE e.id = sub.ev_id
  RETURNING e.id
)
INSERT INTO public.platform_operation_outcomes(operation, business_outcome, payload)
SELECT 'casl_evidence_backfill_lead_via_phone', 'achieved',
       jsonb_build_object('rows', (SELECT count(*) FROM ev_by_phone), 'ts', now());

INSERT INTO public.platform_operation_outcomes(operation, business_outcome, payload)
SELECT 'casl_bridge_backfill_summary', 'achieved',
       jsonb_build_object(
         'bridged_prospect', (SELECT count(*) FROM public.contractor_leads WHERE source_prospect_id IS NOT NULL),
         'bridged_company',  (SELECT count(*) FROM public.contractor_leads WHERE source_company_id  IS NOT NULL),
         'unbridged',        (SELECT count(*) FROM public.contractor_leads WHERE source_prospect_id IS NULL AND source_company_id IS NULL),
         'casl_evidence_with_lead', (SELECT count(*) FROM public.casl_consent_evidence WHERE contractor_lead_id IS NOT NULL),
         'casl_evidence_without_lead', (SELECT count(*) FROM public.casl_consent_evidence WHERE contractor_lead_id IS NULL),
         'ts', now());

COMMIT;
