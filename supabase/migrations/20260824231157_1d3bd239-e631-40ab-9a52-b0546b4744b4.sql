-- 1) Omega conductor: align the phase check constraint with the 12 canonical phases.
ALTER TABLE public.omega_loop_runs DROP CONSTRAINT IF EXISTS omega_loop_phase_check;
ALTER TABLE public.omega_loop_runs ADD CONSTRAINT omega_loop_phase_check CHECK (
  phase = ANY (ARRAY[
    'prospect_discovery','enrichment','scoring','campaign_generation','outreach_send',
    'reply_handling','alex_closing','payment_followup','onboarding_activation',
    'expansion_scan','churn_rescue','metrics_optimize'
  ])
);

-- 2) Compatibility exclusions: make regeneration idempotent (upsert target).
DELETE FROM public.contractor_exclusions a
USING public.contractor_exclusions b
WHERE a.ctid > b.ctid
  AND a.contractor_id = b.contractor_id
  AND a.exclusion_type = b.exclusion_type
  AND COALESCE(a.service_slug,'') = COALESCE(b.service_slug,'');

CREATE UNIQUE INDEX IF NOT EXISTS contractor_exclusions_unique_key
  ON public.contractor_exclusions (contractor_id, exclusion_type, service_slug);