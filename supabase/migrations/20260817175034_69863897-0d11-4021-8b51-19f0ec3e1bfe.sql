-- Purge fabricated / non-routable phone numbers from the recruitment pool
UPDATE public.verified_contractor_prospects
SET phone_validation_status = 'invalid',
    phone_line_type = 'unknown',
    sms_eligible = false,
    outreach_failure_reason = 'phone_not_routable_nanp'
WHERE phone_e164 IS NOT NULL
  AND phone_e164 !~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'
  AND phone_validation_status <> 'invalid';

UPDATE public.contractor_prospects
SET phone = NULL
WHERE phone IS NOT NULL
  AND regexp_replace(phone, '\D', '', 'g') !~ '^1?[2-9][0-9]{2}[2-9][0-9]{6}$';