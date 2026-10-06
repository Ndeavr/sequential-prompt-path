CREATE OR REPLACE FUNCTION public.admin_acquisition_funnel(p_since timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  WITH qa_users AS (
    SELECT id FROM auth.users
    WHERE email ILIKE 'e2e+%@unpro.ca' OR coalesce(raw_user_meta_data->>'e2e_test','') = 'true'
  ),
  q AS (
    SELECT * FROM contractor_pricing_quotes c
    WHERE c.created_at >= p_since AND (c.user_id IS NULL OR c.user_id NOT IN (SELECT id FROM qa_users))
  ),
  s AS (
    SELECT * FROM sms_events_v2
    WHERE created_at >= p_since
      AND coalesce(message_type,'') NOT IN ('otp','test','admin_test','founder','transactional','internal_test')
  )
  SELECT jsonb_build_object(
    'found', (SELECT count(*) FROM verified_contractor_prospects WHERE created_at >= p_since),
    'eligible', (SELECT count(DISTINCT p.id) FROM verified_contractor_prospects p
       JOIN casl_consent_evidence e ON e.destination_type='phone_sms' AND e.is_valid
        AND coalesce(e.refusal_statement_found,false)=false AND (e.expires_at IS NULL OR e.expires_at>now())
        AND e.destination_normalized = regexp_replace(regexp_replace(p.phone_e164,'\D','','g'),'^1(\d{10})$','\1')
       WHERE p.phone_validation_status IN ('valid_mobile','valid_sms_capable_voip')
         AND p.outreach_status IN ('none','delivered')
         AND NOT EXISTS (SELECT 1 FROM sms_opt_outs o WHERE o.normalized_phone=p.phone_e164)),
    'sent', (SELECT count(*) FROM s WHERE twilio_sid IS NOT NULL),
    'delivered', (SELECT count(*) FROM s WHERE status='delivered'),
    'failed', (SELECT count(*) FROM s WHERE status IN ('failed','undelivered')),
    'clicked', (SELECT count(DISTINCT prospect_id) FROM acquisition_events WHERE created_at >= p_since AND event_type ILIKE '%click%'),
    'onboarding_started', (SELECT count(*) FROM q),
    'completed', (SELECT count(*) FROM q WHERE pricing_status::text IN ('offered','accepted','paid')),
    'payment_started', (SELECT count(*) FROM q WHERE pricing_status::text IN ('accepted','paid')),
    'activated', (SELECT count(*) FROM q WHERE pricing_status::text='paid'),
    'outreach_enabled', (SELECT to_jsonb(value) FROM system_flags WHERE key='OUTREACH_ENABLED')
  ) INTO r;
  RETURN r;
END $$;