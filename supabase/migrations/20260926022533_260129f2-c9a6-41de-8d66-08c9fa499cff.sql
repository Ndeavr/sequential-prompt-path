ALTER TABLE public.verified_contractor_prospects DISABLE TRIGGER trg_monotonic_outreach_status;

UPDATE public.verified_contractor_prospects
SET outreach_status = 'none',
    outreach_failure_reason = NULL,
    fallback_reason = NULL,
    delivery_status = NULL,
    channel_used = NULL,
    retry_count = 0,
    last_attempt_at = NULL,
    updated_at = now()
WHERE id IN (
  '12fbf457-ff77-41a8-8032-0eb85de2e7fa',
  'f30a8fdb-876b-461c-8535-94b52a2cccd7',
  '80c6cd57-1e9a-4d1b-badd-b58f7708378f'
)
AND outreach_twilio_sid IS NULL
AND sms_provider_message_id IS NULL
AND email_sent_at IS NULL;

ALTER TABLE public.verified_contractor_prospects ENABLE TRIGGER trg_monotonic_outreach_status;

UPDATE public.system_flags SET value = false, updated_at = now() WHERE key = 'OUTREACH_ENABLED';