-- email_eligible: schema-level capability for carrier-dead SMS prospects
-- to enter the existing compliant email wave WITHOUT downgrading the
-- monotonic outreach_status (the trigger already blocks any downgrade).

ALTER TABLE public.verified_contractor_prospects
  ADD COLUMN IF NOT EXISTS email_eligible boolean,
  ADD COLUMN IF NOT EXISTS email_eligibility_reason text,
  ADD COLUMN IF NOT EXISTS email_eligible_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_vcp_email_eligible
  ON public.verified_contractor_prospects (email_eligible)
  WHERE email_eligible = true;

-- Evidence-only backfill. A prospect qualifies ONLY when every gate passes
-- AND hard carrier-dead evidence exists. No consent inferred, no contact
-- data invented, no outreach_status touched.
UPDATE public.verified_contractor_prospects p
SET email_eligible = true,
    email_eligibility_reason = CASE
      WHEN p.rejection_reason_code = 'landline_confirmed_30006'
        THEN 'sms_carrier_dead:landline_confirmed_30006'
      WHEN p.sms_error_code IN ('21211','21408','21612','21614','30003','30004','30005','30006','30007','30008','30034')
        THEN 'sms_carrier_dead:twilio_' || p.sms_error_code
      WHEN p.sms_eligibility_tier = 'D' AND p.phone_line_type = 'landline'
        THEN 'sms_carrier_dead:tier_D_landline'
      ELSE 'sms_carrier_dead:twilio_undelivered_log'
    END,
    email_eligible_at = now(),
    updated_at = now()
WHERE p.email IS NOT NULL
  AND p.verification_status = 'verified'
  AND p.data_quality_score >= 80
  AND (p.website_url IS NOT NULL OR p.google_business_url IS NOT NULL
       OR p.google_place_id IS NOT NULL OR p.phone_source_url IS NOT NULL)
  AND COALESCE(p.outreach_status, 'none') NOT IN ('registered','payment_started','paid','activated')
  AND NOT public.is_email_suppressed(p.email)
  AND p.email_eligible IS DISTINCT FROM true
  AND (
    EXISTS (
      SELECT 1 FROM public.acq_sms_logs l
      WHERE l.prospect_id = p.id
        AND l.status = 'undelivered'
        AND l.error ~ '(21211|21408|21612|21614|30003|30004|30005|30006|30007|30008|30034)'
    )
    OR p.sms_error_code IN ('21211','21408','21612','21614','30003','30004','30005','30006','30007','30008','30034')
    OR p.rejection_reason_code = 'landline_confirmed_30006'
    OR (p.sms_eligibility_tier = 'D' AND p.phone_line_type = 'landline')
  );