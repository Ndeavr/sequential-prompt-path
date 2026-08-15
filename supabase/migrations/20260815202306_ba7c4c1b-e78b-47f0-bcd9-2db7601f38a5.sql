-- ============ A. official_source_registry: source-aware + CKAN resource tracking ============
ALTER TABLE public.official_source_registry
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'novoclimat',
  ADD COLUMN IF NOT EXISTS dataset_slug text,
  ADD COLUMN IF NOT EXISTS resource_id text,
  ADD COLUMN IF NOT EXISTS resource_url text,
  ADD COLUMN IF NOT EXISTS resource_format text,
  ADD COLUMN IF NOT EXISTS resource_last_modified timestamptz,
  ADD COLUMN IF NOT EXISTS resource_checksum text,
  ADD COLUMN IF NOT EXISTS ingest_cursor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_run_summary jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============ B. official_source_records: generic official model ============
ALTER TABLE public.official_source_records
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'novoclimat',
  ADD COLUMN IF NOT EXISTS source_record_key text,
  ADD COLUMN IF NOT EXISTS neq text,
  ADD COLUMN IF NOT EXISTS rbq_license text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS official_domain text,
  ADD COLUMN IF NOT EXISTS contact_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS enrichment_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS next_enrichment_eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS raw_record jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 0;

-- Deterministic backfill of the stable record key (preserves every existing row).
UPDATE public.official_source_records
SET source_record_key = COALESCE(
      NULLIF(certificate_no, ''),
      'h_' || encode(digest(business_name_norm || '|' || COALESCE(region, '') || '|' || COALESCE(municipality, ''), 'sha256'), 'hex')
    )
WHERE source_record_key IS NULL;

UPDATE public.official_source_records
SET contact_status = CASE
      WHEN phone_e164 IS NOT NULL OR email IS NOT NULL THEN 'published_in_source'
      ELSE 'needs_enrichment'
    END
WHERE contact_status = 'unknown';

ALTER TABLE public.official_source_records
  ALTER COLUMN source_record_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS official_source_records_source_key_record_key_uidx
  ON public.official_source_records (source_key, source_record_key);
CREATE INDEX IF NOT EXISTS official_source_records_neq_idx ON public.official_source_records (neq) WHERE neq IS NOT NULL;
CREATE INDEX IF NOT EXISTS official_source_records_rbq_idx ON public.official_source_records (rbq_license) WHERE rbq_license IS NOT NULL;
CREATE INDEX IF NOT EXISTS official_source_records_phone_idx ON public.official_source_records (phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS official_source_records_domain_idx ON public.official_source_records (official_domain) WHERE official_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS official_source_records_name_postal_idx ON public.official_source_records (business_name_norm, postal_code);
CREATE INDEX IF NOT EXISTS official_source_records_enrichment_idx ON public.official_source_records (source_kind, contact_status, enrichment_status);

-- ============ C. External enrichment provider budget (atomic) ============
CREATE TABLE IF NOT EXISTS public.external_enrichment_budget (
  provider text NOT NULL,
  budget_date date NOT NULL,
  calls_used integer NOT NULL DEFAULT 0,
  items_used integer NOT NULL DEFAULT 0,
  cost_usd_used numeric(10,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, budget_date)
);
GRANT SELECT ON public.external_enrichment_budget TO authenticated;
GRANT ALL ON public.external_enrichment_budget TO service_role;
ALTER TABLE public.external_enrichment_budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read enrichment budget" ON public.external_enrichment_budget
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages enrichment budget" ON public.external_enrichment_budget
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.reserve_external_enrichment_call(
  p_provider text DEFAULT 'dataforseo',
  p_items integer DEFAULT 10,
  p_est_cost_usd numeric DEFAULT 0.02
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_calls constant integer := 100;
  v_max_items constant integer := 500;
  v_max_cost constant numeric := 5.0;
  v_date date := (now() AT TIME ZONE 'America/Toronto')::date;
  v_row public.external_enrichment_budget%ROWTYPE;
  v_allowed boolean := false;
  v_reason text := 'ok';
BEGIN
  INSERT INTO public.external_enrichment_budget AS b (provider, budget_date, calls_used, items_used, cost_usd_used)
  VALUES (p_provider, v_date, 1, GREATEST(p_items, 0), GREATEST(p_est_cost_usd, 0))
  ON CONFLICT (provider, budget_date) DO UPDATE
    SET calls_used = b.calls_used + 1,
        items_used = b.items_used + GREATEST(p_items, 0),
        cost_usd_used = b.cost_usd_used + GREATEST(p_est_cost_usd, 0),
        updated_at = now()
    WHERE b.calls_used + 1 <= v_max_calls
      AND b.items_used + GREATEST(p_items, 0) <= v_max_items
      AND b.cost_usd_used + GREATEST(p_est_cost_usd, 0) <= v_max_cost
  RETURNING * INTO v_row;

  IF v_row.provider IS NOT NULL THEN
    v_allowed := true;
  ELSE
    SELECT * INTO v_row FROM public.external_enrichment_budget
      WHERE provider = p_provider AND budget_date = v_date;
    IF v_row.provider IS NULL THEN
      v_reason := 'over_request_size';
    ELSIF v_row.calls_used + 1 > v_max_calls THEN
      v_reason := 'calls_cap_reached';
    ELSIF v_row.items_used + GREATEST(p_items, 0) > v_max_items THEN
      v_reason := 'items_cap_reached';
    ELSE
      v_reason := 'cost_cap_reached';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'provider', p_provider,
    'budget_date', v_date,
    'calls_used', COALESCE(v_row.calls_used, 0),
    'items_used', COALESCE(v_row.items_used, 0),
    'cost_usd_used', COALESCE(v_row.cost_usd_used, 0),
    'max_calls', v_max_calls,
    'max_items', v_max_items,
    'max_cost_usd', v_max_cost
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_external_enrichment_cost(
  p_provider text,
  p_actual_cost_usd numeric,
  p_est_cost_usd numeric,
  p_actual_items integer,
  p_est_items integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date date := (now() AT TIME ZONE 'America/Toronto')::date;
BEGIN
  UPDATE public.external_enrichment_budget
     SET cost_usd_used = GREATEST(0, cost_usd_used - GREATEST(p_est_cost_usd,0) + GREATEST(p_actual_cost_usd,0)),
         items_used = GREATEST(0, items_used - GREATEST(p_est_items,0) + GREATEST(p_actual_items,0)),
         updated_at = now()
   WHERE provider = p_provider AND budget_date = v_date;
END;
$$;

-- ============ D. Provider circuit breaker (OFF by default) ============
CREATE TABLE IF NOT EXISTS public.external_enrichment_circuit (
  provider text PRIMARY KEY,
  kill_switch boolean NOT NULL DEFAULT true,
  enabled_by uuid,
  enabled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.external_enrichment_circuit TO authenticated;
GRANT ALL ON public.external_enrichment_circuit TO service_role;
ALTER TABLE public.external_enrichment_circuit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read enrichment circuit" ON public.external_enrichment_circuit
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages enrichment circuit" ON public.external_enrichment_circuit
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.external_enrichment_circuit (provider, kill_switch, notes)
VALUES ('dataforseo', true, 'Désactivé par défaut — activation admin explicite requise (plafonds 5 USD / 100 appels / 500 éléments par jour).')
ON CONFLICT (provider) DO NOTHING;

-- ============ E. DataForSEO attempts / cache ============
CREATE TABLE IF NOT EXISTS public.dataforseo_enrichment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_source_record_id uuid NOT NULL REFERENCES public.official_source_records(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'dataforseo',
  status text NOT NULL DEFAULT 'queued',
  attempt_count integer NOT NULL DEFAULT 0,
  query_title text,
  query_locality text,
  match_score numeric(5,2),
  matched_title text,
  matched_phone text,
  matched_website text,
  matched_address text,
  conflict_reason text,
  items_returned integer NOT NULL DEFAULT 0,
  cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  response_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  next_eligible_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dataforseo_enrichment_attempts TO authenticated;
GRANT ALL ON public.dataforseo_enrichment_attempts TO service_role;
ALTER TABLE public.dataforseo_enrichment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read dataforseo attempts" ON public.dataforseo_enrichment_attempts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages dataforseo attempts" ON public.dataforseo_enrichment_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS dataforseo_attempts_record_idx ON public.dataforseo_enrichment_attempts (official_source_record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dataforseo_attempts_status_idx ON public.dataforseo_enrichment_attempts (status, next_eligible_at);

CREATE TRIGGER trg_dataforseo_attempts_updated_at
  BEFORE UPDATE ON public.dataforseo_enrichment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();