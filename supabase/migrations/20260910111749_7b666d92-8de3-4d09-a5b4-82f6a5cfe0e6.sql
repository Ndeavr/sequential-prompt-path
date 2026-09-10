-- Quarantine (never delete) queue rows whose prospect is NOT eligible to the
-- free 12-month local-service offer. These are legacy construction/renovation
-- prospects (roofing, plumbing, insulation, drain) with no normalized service
-- category; they were starving the free campaign's email wave.
UPDATE public.acquisition_queue q
SET state = 'quarantined',
    last_error = 'not_free_service_campaign:' || COALESCE(p.service_category_slug, 'no_normalized_service_category'),
    updated_at = now()
FROM public.verified_contractor_prospects p
WHERE p.id = q.prospect_id
  AND q.state IN ('ready_email', 'ready_sms')
  AND (
    p.service_category_slug IS NULL
    OR p.service_category_slug NOT IN (
      SELECT slug FROM public.founder_eligible_categories WHERE is_active = true
    )
  );

-- Fast lookup of genuinely free-eligible prospects.
CREATE INDEX IF NOT EXISTS vcp_free_service_slug_idx
  ON public.verified_contractor_prospects (service_category_slug, city)
  WHERE service_category_slug IS NOT NULL;
