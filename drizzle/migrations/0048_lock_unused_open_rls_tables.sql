-- Security P0 2026-11-09: 26 EMPTY tables, unused by app code, edge functions,
-- views and SQL functions, had USING(true)/WITH CHECK(true) client policies.
-- Tightening only: open policies are removed, RLS stays on, grants unchanged,
-- service_role (edge/admin code) unaffected; admins keep read access.
-- Rollback: recreate each dropped policy with USING (true) / WITH CHECK (true)
-- for its original roles (public, anon/authenticated or authenticated).
DO $$
DECLARE t text; n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['adaptive_sessions','alex_context_snapshots','alex_homeowner_conversion_scores','alex_homeowner_prompt_performance','alex_prompt_logs','alex_realtime_sessions','alex_voice_latency_events','alex_voice_session_scores','audits_screenshots','booking_slot_scores','campagnes_acquisition','category_problem_links','entrepreneur_assets','entrepreneur_profile_fields','insights_prospects','owner_match_photos','owner_match_recommendations','prediction_matches','recruitment_scores','referral_rewards','scores_aipp_prospects','scores_delivrabilite','self_serve_goal_plan_inputs','self_serve_goal_plan_results','self_serve_goal_plan_sessions','user_pain_points'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'guard: % has % rows, refusing to change its policies', t, n; END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Anyone can insert adaptive sessions" ON public.adaptive_sessions;
DROP POLICY IF EXISTS "Anyone can read adaptive sessions" ON public.adaptive_sessions;
DROP POLICY IF EXISTS "Anyone can insert snapshots" ON public.alex_context_snapshots;
DROP POLICY IF EXISTS "Anyone can view snapshots" ON public.alex_context_snapshots;
DROP POLICY IF EXISTS "Insert homeowner conversion scores" ON public.alex_homeowner_conversion_scores;
DROP POLICY IF EXISTS "Read homeowner conversion scores" ON public.alex_homeowner_conversion_scores;
DROP POLICY IF EXISTS "Admin insert homeowner prompt perf" ON public.alex_homeowner_prompt_performance;
DROP POLICY IF EXISTS "Admin read homeowner prompt perf" ON public.alex_homeowner_prompt_performance;
DROP POLICY IF EXISTS "Users can insert their own prompt logs" ON public.alex_prompt_logs;
DROP POLICY IF EXISTS "Users can read their own prompt logs" ON public.alex_prompt_logs;
DROP POLICY IF EXISTS "Public insert realtime sessions" ON public.alex_realtime_sessions;
DROP POLICY IF EXISTS "Public read realtime sessions" ON public.alex_realtime_sessions;
DROP POLICY IF EXISTS "Anyone can insert latency events" ON public.alex_voice_latency_events;
DROP POLICY IF EXISTS "Anyone can read latency events" ON public.alex_voice_latency_events;
DROP POLICY IF EXISTS "Authenticated insert session scores" ON public.alex_voice_session_scores;
DROP POLICY IF EXISTS "Authenticated read voice session scores" ON public.alex_voice_session_scores;
DROP POLICY IF EXISTS "auth_insert_screenshots" ON public.audits_screenshots;
DROP POLICY IF EXISTS "auth_read_screenshots" ON public.audits_screenshots;
DROP POLICY IF EXISTS "service_insert_slot_scores" ON public.booking_slot_scores;
DROP POLICY IF EXISTS "auth_insert_campagnes" ON public.campagnes_acquisition;
DROP POLICY IF EXISTS "auth_read_campagnes" ON public.campagnes_acquisition;
DROP POLICY IF EXISTS "category_problem_links_public_read" ON public.category_problem_links;
DROP POLICY IF EXISTS "Anyone can insert assets" ON public.entrepreneur_assets;
DROP POLICY IF EXISTS "Anyone can view assets" ON public.entrepreneur_assets;
DROP POLICY IF EXISTS "Anyone can insert profile fields" ON public.entrepreneur_profile_fields;
DROP POLICY IF EXISTS "Anyone can view profile fields" ON public.entrepreneur_profile_fields;
DROP POLICY IF EXISTS "auth_insert_insights" ON public.insights_prospects;
DROP POLICY IF EXISTS "auth_read_insights" ON public.insights_prospects;
DROP POLICY IF EXISTS "Anyone can insert match photos" ON public.owner_match_photos;
DROP POLICY IF EXISTS "Anyone can read match photos" ON public.owner_match_photos;
DROP POLICY IF EXISTS "Anyone can read match recommendations" ON public.owner_match_recommendations;
DROP POLICY IF EXISTS "Anyone can read matches" ON public.prediction_matches;
DROP POLICY IF EXISTS "System can insert matches" ON public.prediction_matches;
DROP POLICY IF EXISTS "Authenticated users can insert recruitment scores" ON public.recruitment_scores;
DROP POLICY IF EXISTS "Authenticated users can read recruitment scores" ON public.recruitment_scores;
DROP POLICY IF EXISTS "System can insert rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "auth_insert_scores_aipp" ON public.scores_aipp_prospects;
DROP POLICY IF EXISTS "auth_read_scores_aipp" ON public.scores_aipp_prospects;
DROP POLICY IF EXISTS "auth_insert_delivrabilite" ON public.scores_delivrabilite;
DROP POLICY IF EXISTS "auth_read_delivrabilite" ON public.scores_delivrabilite;
DROP POLICY IF EXISTS "Anyone can insert inputs" ON public.self_serve_goal_plan_inputs;
DROP POLICY IF EXISTS "Anyone can read inputs" ON public.self_serve_goal_plan_inputs;
DROP POLICY IF EXISTS "Anyone can insert results" ON public.self_serve_goal_plan_results;
DROP POLICY IF EXISTS "Anyone can read results" ON public.self_serve_goal_plan_results;
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.self_serve_goal_plan_sessions;
DROP POLICY IF EXISTS "Anyone can read own session" ON public.self_serve_goal_plan_sessions;
DROP POLICY IF EXISTS "Anyone can insert pain points" ON public.user_pain_points;
DROP POLICY IF EXISTS "Anyone can read pain points" ON public.user_pain_points;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['adaptive_sessions','alex_context_snapshots','alex_homeowner_conversion_scores','alex_homeowner_prompt_performance','alex_prompt_logs','alex_realtime_sessions','alex_voice_latency_events','alex_voice_session_scores','audits_screenshots','campagnes_acquisition','category_problem_links','entrepreneur_assets','entrepreneur_profile_fields','insights_prospects','owner_match_photos','owner_match_recommendations','prediction_matches','recruitment_scores','scores_aipp_prospects','scores_delivrabilite','self_serve_goal_plan_inputs','self_serve_goal_plan_results','self_serve_goal_plan_sessions','user_pain_points'] LOOP
    EXECUTE format('CREATE POLICY "admin_read_%s" ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role))', t, t);
  END LOOP;
END $$;