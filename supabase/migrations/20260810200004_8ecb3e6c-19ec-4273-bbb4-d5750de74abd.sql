DO $$
DECLARE v_contractor uuid; v_user uuid; v_prospect uuid;
BEGIN
  SELECT id, user_id INTO v_contractor, v_user FROM public.contractors WHERE email = '__e2e__activation@unpro.ca' LIMIT 1;
  SELECT id INTO v_prospect FROM public.verified_contractor_prospects WHERE business_name = '__E2E__ Activation Control' LIMIT 1;

  IF v_contractor IS NOT NULL THEN
    DELETE FROM public.contractors WHERE id = v_contractor;
  END IF;
  IF v_user IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_user;
    DELETE FROM auth.users WHERE id = v_user;
  END IF;
  IF v_prospect IS NOT NULL THEN
    DELETE FROM public.pipeline_engagement_events WHERE prospect_id = v_prospect;
    DELETE FROM public.unpro_payment_activation_audit WHERE prospect_id = v_prospect;
    DELETE FROM public.verified_contractor_prospects WHERE id = v_prospect;
  END IF;

  DELETE FROM public.billing_checkout_sessions WHERE stripe_checkout_session_id LIKE 'cs_test___e2e_%';
  DELETE FROM public.stripe_webhook_events WHERE stripe_event_id LIKE 'evt___e2e_%';
END $$;