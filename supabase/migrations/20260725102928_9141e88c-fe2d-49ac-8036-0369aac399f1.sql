
-- 1. Add tracking columns for channel used + email fallback
ALTER TABLE public.verified_contractor_prospects
  ADD COLUMN IF NOT EXISTS channel_used text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_provider_message_id text,
  ADD COLUMN IF NOT EXISTS email_failure_reason text,
  ADD COLUMN IF NOT EXISTS fallback_reason text;

-- 2. Extend outreach_status to include email-only and bounced states
ALTER TABLE public.verified_contractor_prospects
  DROP CONSTRAINT IF EXISTS verified_contractor_prospects_outreach_status_check;
ALTER TABLE public.verified_contractor_prospects
  ADD CONSTRAINT verified_contractor_prospects_outreach_status_check
  CHECK (outreach_status = ANY (ARRAY[
    'none','queued','sent','sent_email','delivered','clicked','failed','activated','bounced'
  ]));

-- 3. Relax the SMS-tier trigger so LTI-unavailable numbers still qualify for a
--    tier-C SMS attempt (no more silent Canadian quarantine).
CREATE OR REPLACE FUNCTION public.compute_sms_eligibility_tier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.phone_e164 IS NULL THEN
    NEW.sms_eligibility_tier := NULL;
    NEW.sms_eligibility_confidence := 'low';
    NEW.eligibility_reason := 'no_phone';
  ELSIF NEW.phone_line_type = 'mobile' OR NEW.phone_validation_status = 'valid_mobile' THEN
    NEW.sms_eligibility_tier := 'A';
    NEW.sms_eligibility_confidence := 'high';
    NEW.eligibility_reason := 'mobile_line';
  ELSIF NEW.phone_line_type IN ('voip','nonFixedVoip') OR NEW.phone_validation_status = 'valid_sms_capable_voip' THEN
    NEW.sms_eligibility_tier := 'B';
    NEW.sms_eligibility_confidence := 'high';
    NEW.eligibility_reason := 'voip_sms_capable';
  ELSIF NEW.phone_line_type = 'landline' OR NEW.phone_validation_status = 'landline' THEN
    NEW.sms_eligibility_tier := 'D';
    NEW.sms_eligibility_confidence := 'high';
    NEW.eligibility_reason := 'landline_email_only';
  ELSIF NEW.verification_status = 'verified'
        AND COALESCE(NEW.phone_line_type,'unknown') = 'unknown'
        AND NEW.phone_validation_status NOT IN ('landline','invalid','disconnected') THEN
    -- LTI unavailable (e.g. Canada NPAC not provisioned) — attempt SMS with automatic email fallback.
    NEW.sms_eligibility_tier := 'C';
    NEW.sms_eligibility_confidence := 'medium';
    NEW.eligibility_reason := 'lti_unavailable_attempt_sms_with_email_fallback';
  ELSE
    NEW.sms_eligibility_tier := NULL;
    NEW.sms_eligibility_confidence := 'low';
    NEW.eligibility_reason := 'insufficient_data';
  END IF;
  RETURN NEW;
END;
$function$;
