DO $security$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
  END LOOP;
END
$security$;

DO $allowlist$
DECLARE
  f record;
  authenticated_names text[] := ARRAY[
    'affiliate_entry_by_slug','affiliate_offer_free_appointments','affiliate_offer_public_state','approve_company','approve_prospect','assign_affiliate_parent','calculate_contractor_live_score','check_founder_eligibility','check_territory_availability','claim_outreach_target','compute_email_system_status','contractor_plan_code','crm_prospect_timeline','founder_public_signup','generate_territories','get_admin_page_stats','get_alex_score_reveal_session','get_audit_landing_by_slug','get_avg_job_value','get_contractor_comms_timeline','get_contractor_public_profile','get_my_affiliate_earnings','get_my_affiliate_team','get_outreach_target','get_profile_completeness','get_recruitment_offer_by_token','get_sms_outbound_health','homeowner_can_add_property','homeowner_usage_snapshot','manual_queue_for_me','mark_outreach_first_viewed','merge_contractor_prospects','pipeline_data_integrity_report','recover_blocked_launch_leads','reject_company','reject_prospect','resolve_qr_token','rpc_acquisition_intelligence_summary','rpc_get_recruitment_funnel_stats','rpc_pipeline_get_live_overview','rpc_pipeline_get_run_details','rpc_pipeline_resolve_blocker','rpc_pipeline_retry_run','set_system_flag','stalled_activations_report','stripe_reconciliation_report','update_profile_field_partial','validate_unpro_promo_code'
  ];
  anonymous_names text[] := ARRAY[
    'affiliate_entry_by_slug','affiliate_offer_public_state','check_founder_eligibility','check_territory_availability','contractor_plan_code','founder_public_signup','get_alex_score_reveal_session','get_audit_landing_by_slug','get_contractor_public_profile','get_outreach_target','get_recruitment_offer_by_token','mark_outreach_first_viewed','resolve_qr_token','validate_unpro_promo_code'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname = ANY(authenticated_names)
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.signature);
  END LOOP;
  FOR f IN
    SELECT p.oid::regprocedure AS signature, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname = ANY(anonymous_names)
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', f.signature);
  END LOOP;
END
$allowlist$;