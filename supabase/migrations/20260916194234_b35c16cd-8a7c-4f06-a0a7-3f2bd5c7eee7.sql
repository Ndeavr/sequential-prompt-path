-- 1) Lecture publique des profils AIPP publiés : les politiques RLS existantes
--    limitent déjà chaque table aux profils publiés (public.aipp_is_published)
--    ou aux admins. Il manquait uniquement les GRANT, d'où « permission denied ».
GRANT SELECT ON
  public.aipp_profiles,
  public.aipp_profile_services,
  public.aipp_profile_locations,
  public.aipp_profile_media,
  public.aipp_profile_reviews,
  public.aipp_profile_sources,
  public.aipp_profile_scores,
  public.aipp_profile_validations,
  public.aipp_entity_facts,
  public.aipp_detected_methods,
  public.aipp_geo_pages,
  public.aipp_scores
TO anon, authenticated;

GRANT ALL ON
  public.aipp_profiles,
  public.aipp_profile_services,
  public.aipp_profile_locations,
  public.aipp_profile_media,
  public.aipp_profile_reviews,
  public.aipp_profile_sources,
  public.aipp_profile_scores,
  public.aipp_profile_validations,
  public.aipp_entity_facts,
  public.aipp_detected_methods,
  public.aipp_geo_pages,
  public.aipp_scores,
  public.aipp_audits,
  public.aipp_audit_entities,
  public.aipp_audit_scores,
  public.aipp_audit_recommendations,
  public.aipp_profile_corrections,
  public.aipp_score_checks,
  public.aipp_schema_snapshots,
  public.aipp_import_runs
TO service_role;

GRANT EXECUTE ON FUNCTION public.aipp_is_published(uuid) TO anon, authenticated, service_role;

-- 2) Journal de prospection : le rôle serveur doit pouvoir écrire les événements.
GRANT ALL ON
  public.outreach_messages,
  public.outreach_email_events,
  public.outreach_sms_events,
  public.outreach_logs,
  public.acq_sms_logs,
  public.acq_email_logs,
  public.sms_events,
  public.sms_events_v2,
  public.sms_event_queue,
  public.prospect_email_events,
  public.agent_outreach_messages
TO service_role;

GRANT EXECUTE ON FUNCTION public.record_email_event(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_outreach_sms_event(text, text, jsonb) TO service_role;