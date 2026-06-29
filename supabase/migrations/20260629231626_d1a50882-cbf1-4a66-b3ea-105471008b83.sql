
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS phone_lookup_raw jsonb,
  ADD COLUMN IF NOT EXISTS phone_lookup_http_status int,
  ADD COLUMN IF NOT EXISTS tentative_send boolean NOT NULL DEFAULT false;

UPDATE public.contractor_leads
   SET phone_failure_reason = 'missing_phone',
       phone_validation_status = 'invalid_phone'
 WHERE (phone IS NULL OR phone = '')
   AND (mobile_phone IS NULL OR mobile_phone = '')
   AND COALESCE(phone_failure_reason, 'invalid_format') = 'invalid_format';

UPDATE public.contractor_leads
   SET phone_validation_status = 'pending_validation',
       validation_status = 'pending_validation',
       phone_failure_reason = NULL
 WHERE phone_validation_status = 'lookup_failed';
