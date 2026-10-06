CREATE OR REPLACE FUNCTION public.admin_acquisition_funnel(p_since timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'found', (SELECT count(*) FROM verified_contractor_prospects WHERE created_at >= p_since),
    'eligible', (SELECT count(DISTINCT p.id) FROM verified_contractor_prospects p
       JOIN casl_consent_evidence e ON e.destination_type='phone_sms' AND e.is_valid
        AND coalesce(e.refusal_statement_found,false)=false AND (e.expires_at IS NULL OR e.expires_at>now())
        AND e.destination_normalized = regexp_replace(regexp_replace(p.phone_e164,'\D','','g'),'^1(\d{10})$','\1')
       WHERE p.phone_validation_status IN ('valid_mobile','valid_sms_capable_voip')
         AND p.outreach_status IN ('none','delivered')
         AND NOT EXISTS (SELECT 1 FROM sms_opt_outs o WHERE o.normalized_phone=p.phone_e164)),
    'sent', (SELECT count(*) FROM acq_sms_logs WHERE created_at >= p_since AND provider_message_id IS NOT NULL),
    'delivered', (SELECT count(*) FROM acq_sms_logs WHERE created_at >= p_since AND status='delivered'),
    'failed', (SELECT count(*) FROM acq_sms_logs WHERE created_at >= p_since AND status IN ('failed','undelivered')),
    'clicked', (SELECT count(DISTINCT prospect_id) FROM acquisition_events WHERE created_at >= p_since AND event_type ILIKE '%click%'),
    'onboarding_started', (SELECT count(*) FROM contractor_pricing_quotes WHERE created_at >= p_since),
    'completed', (SELECT count(*) FROM contractor_pricing_quotes WHERE created_at >= p_since AND status IN ('offered','accepted','paid')),
    'payment_started', (SELECT count(*) FROM contractor_pricing_quotes WHERE created_at >= p_since AND status IN ('accepted','paid')),
    'activated', (SELECT count(*) FROM contractor_pricing_quotes WHERE created_at >= p_since AND status='paid'),
    'outreach_enabled', (SELECT value FROM system_flags WHERE key='OUTREACH_ENABLED')
  ) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.admin_acquisition_funnel(timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_acquisition_funnel(timestamptz) TO authenticated;