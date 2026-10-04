DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd FROM pg_policies
    WHERE schemaname='public' AND (qual='true' OR with_check='true')
      AND cmd IN ('ALL','UPDATE')
      AND tablename = ANY (ARRAY[
        'agent_target_items','agent_target_lists','alex_brand_phonetic_lock','alex_voice_output_filters','alex_voice_pronunciation_rules',
        'article_internal_links','article_keywords','article_seo_scores','campagnes_acquisition','deliverability_domain_profiles','deliverability_scores',
        'dynamic_pricing_size_snapshots','email_audit_checks','email_audit_runs','email_authentication_checks','email_domain_configs','email_fix_recommendations',
        'email_health_reports','email_personalizations','email_sequence_steps','email_sequences','email_warmup_logs','evenements_sms',
        'outbound_autopilot_recommendations','outbound_autopilot_runs','outbound_campaign_targets','outbound_global_settings','outbound_lead_enrichment',
        'outbound_scraped_entities','outbound_scraping_runs','outbound_scraping_sources','outbound_sending_runs','outbound_sent_messages','pricing_rules',
        'project_sizing_ai_classifications','prospect_aipp_snapshots','prospect_email_messages','prospect_email_send_attempts','prospect_email_sequences',
        'prospect_enrichment_signals','prospect_execution_runs','prospect_execution_steps','prospect_import_runs','prospect_plan_sessions','prospect_records',
        'revenue_loss_estimations','sending_domains','sending_mailboxes','sequences_emails','signature_territory_locks','sms_fallback_sequences',
        'sms_image_rules','sms_image_templates','sms_messages','unopened_email_flags','upgrade_pressure_events',
        'aipp_audits','referral_progress','referral_rewards'])
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated USING (public.has_role(auth.uid(), %L::public.app_role)) WITH CHECK (public.has_role(auth.uid(), %L::public.app_role))',
      r.policyname, r.tablename, 'admin', 'admin');
  END LOOP;
END $$;