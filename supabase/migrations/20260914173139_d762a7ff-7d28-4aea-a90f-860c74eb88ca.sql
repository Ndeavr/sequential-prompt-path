-- 1. Funnel event logging: policies existed but no table privileges were ever granted.
GRANT INSERT ON public.contractor_funnel_events TO anon, authenticated;
GRANT SELECT ON public.contractor_funnel_events TO authenticated;
GRANT ALL ON public.contractor_funnel_events TO service_role;

-- 2. Public AIPP profiles: the published-gate function had no EXECUTE grant,
--    producing "permission denied for function aipp_is_published".
GRANT EXECUTE ON FUNCTION public.aipp_is_published(uuid) TO anon, authenticated, service_role;

-- 3. Public-safe read on the tables that already carry a public_read policy.
--    RLS still restricts rows to published profiles only.
GRANT SELECT ON public.aipp_profiles TO anon, authenticated;
GRANT SELECT ON public.aipp_profile_sources TO anon, authenticated;
GRANT SELECT ON public.aipp_profile_services TO anon, authenticated;
GRANT SELECT ON public.aipp_profile_locations TO anon, authenticated;
GRANT SELECT ON public.aipp_profile_media TO anon, authenticated;
GRANT SELECT ON public.aipp_profile_reviews TO anon, authenticated;
GRANT SELECT ON public.aipp_profile_validations TO anon, authenticated;
GRANT SELECT ON public.aipp_profile_scores TO anon, authenticated;
GRANT SELECT ON public.aipp_entity_facts TO anon, authenticated;
GRANT SELECT ON public.aipp_schema_snapshots TO anon, authenticated;

GRANT ALL ON public.aipp_profiles TO service_role;
GRANT ALL ON public.aipp_profile_sources TO service_role;
GRANT ALL ON public.aipp_profile_services TO service_role;
GRANT ALL ON public.aipp_profile_locations TO service_role;
GRANT ALL ON public.aipp_profile_media TO service_role;
GRANT ALL ON public.aipp_profile_reviews TO service_role;
GRANT ALL ON public.aipp_profile_validations TO service_role;
GRANT ALL ON public.aipp_profile_scores TO service_role;
GRANT ALL ON public.aipp_entity_facts TO service_role;
GRANT ALL ON public.aipp_schema_snapshots TO service_role;
GRANT ALL ON public.aipp_profile_corrections TO service_role;
GRANT ALL ON public.aipp_import_runs TO service_role;