UPDATE public.verified_contractor_prospects
SET outreach_status = 'none',
    outreach_failure_reason = NULL,
    fallback_reason = NULL,
    delivery_status = NULL,
    channel_used = NULL,
    retry_count = 0,
    last_attempt_at = NULL,
    updated_at = now()
WHERE id = '12fbf457-ff77-41a8-8032-0eb85de2e7fa'
  AND outreach_status = 'failed'
  AND outreach_twilio_sid IS NULL;