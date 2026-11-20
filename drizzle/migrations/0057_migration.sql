-- Security scan: replace open (USING/WITH CHECK true) policies where no non-admin
-- browser caller depends on them. Edge functions use the service role (bypasses RLS);
-- admin screens keep access through has_role(admin). No data is changed.

-- 1) Tables read/written only by the server (service role) or admins
DROP POLICY IF EXISTS "alex_runtime_sessions_public_insert" ON public.alex_runtime_sessions;
DROP POLICY IF EXISTS "Anyone can insert turn logs" ON public.alex_turn_logs;
DROP POLICY IF EXISTS "Anyone can insert retry" ON public.alex_match_retry_queue;
DROP POLICY IF EXISTS "Anyone can insert notification" ON public.alex_match_notifications;
DROP POLICY IF EXISTS "Public read ai_visibility_reports" ON public.ai_visibility_reports;
DROP POLICY IF EXISTS "Anyone can read feature values" ON public.product_feature_values;
DROP POLICY IF EXISTS "nav_role_rules_public_read" ON public.navigation_role_rules;
DROP POLICY IF EXISTS "Public read capacity snapshots" ON public.capacity_snapshots;
DROP POLICY IF EXISTS "Public read capacity recommendations" ON public.capacity_recommendations;
DROP POLICY IF EXISTS "Auth users can view primary activities" ON public.activities_primary;
DROP POLICY IF EXISTS "Auth users can view secondary activities" ON public.activities_secondary;
DROP POLICY IF EXISTS "Authenticated users can read market scores" ON public.territory_market_scores;
DROP POLICY IF EXISTS "Voice turns insertable by all" ON public.alex_voice_turns;

DROP POLICY IF EXISTS "ai_score_public_read" ON public.contractor_ai_score;
CREATE POLICY "Admins read contractor ai score" ON public.contractor_ai_score
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can insert scores" ON public.alex_answer_scores;
DROP POLICY IF EXISTS "Anyone can view scores" ON public.alex_answer_scores;
CREATE POLICY "Admins read answer scores" ON public.alex_answer_scores
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ai_rank_public_read" ON public.ai_recommendation_rank;
CREATE POLICY "Admins read recommendation rank" ON public.ai_recommendation_rank
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can insert voice provider events" ON public.alex_voice_provider_events;
DROP POLICY IF EXISTS "Anyone can read voice provider events" ON public.alex_voice_provider_events;
CREATE POLICY "Admins read voice provider events" ON public.alex_voice_provider_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "offer_versions_read" ON public.contractor_offer_versions;
CREATE POLICY "Admins read offer versions" ON public.contractor_offer_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can read generation limits" ON public.generation_limits;
CREATE POLICY "Admins read generation limits" ON public.generation_limits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Embeddings publicly readable" ON public.contractor_embeddings;
CREATE POLICY "Admins read contractor embeddings" ON public.contractor_embeddings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Insert homeowner diagnoses" ON public.homeowner_project_diagnoses;
DROP POLICY IF EXISTS "Read homeowner diagnoses" ON public.homeowner_project_diagnoses;
CREATE POLICY "Admins read homeowner diagnoses" ON public.homeowner_project_diagnoses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Insert homeowner recommendations" ON public.homeowner_match_recommendations;
DROP POLICY IF EXISTS "Read homeowner recommendations" ON public.homeowner_match_recommendations;
CREATE POLICY "Admins read homeowner recommendations" ON public.homeowner_match_recommendations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can insert engagement events" ON public.sniper_engagement_events;
DROP POLICY IF EXISTS "Authenticated can read engagement events" ON public.sniper_engagement_events;
CREATE POLICY "Admins read engagement events" ON public.sniper_engagement_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Go-live verification journals: admin dashboards only
DROP POLICY IF EXISTS "auth_insert_verification_runs" ON public.verification_runs;
DROP POLICY IF EXISTS "auth_select_verification_runs" ON public.verification_runs;
CREATE POLICY "Admins insert verification runs" ON public.verification_runs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read verification runs" ON public.verification_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "auth_insert_verification_failures" ON public.verification_failures;
DROP POLICY IF EXISTS "auth_select_verification_failures" ON public.verification_failures;
CREATE POLICY "Admins insert verification failures" ON public.verification_failures
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read verification failures" ON public.verification_failures
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "auth_insert_verification_steps" ON public.verification_steps;
DROP POLICY IF EXISTS "auth_select_verification_steps" ON public.verification_steps;
CREATE POLICY "Admins insert verification steps" ON public.verification_steps
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read verification steps" ON public.verification_steps
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Contractor objectives: the owning contractor (or an admin) only
DROP POLICY IF EXISTS "Anyone can insert objectives" ON public.onboarding_objectives;
DROP POLICY IF EXISTS "Anyone can read own objectives" ON public.onboarding_objectives;
CREATE POLICY "Owners insert onboarding objectives" ON public.onboarding_objectives
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = onboarding_objectives.contractor_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Owners read onboarding objectives" ON public.onboarding_objectives
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = onboarding_objectives.contractor_id AND c.user_id = auth.uid())
  );

-- 4) Write-only telemetry from the browser: keep the insert, make reads admin-only
DROP POLICY IF EXISTS "Authenticated users can read pronunciation logs" ON public.alex_voice_pronunciation_logs;
CREATE POLICY "Admins read pronunciation logs" ON public.alex_voice_pronunciation_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Auth users can view voice errors" ON public.voice_session_errors;
CREATE POLICY "Admins read voice errors" ON public.voice_session_errors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Auth users can view state transitions" ON public.voice_session_state_transitions;
CREATE POLICY "Admins read state transitions" ON public.voice_session_state_transitions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Anyone can read voice fallback events" ON public.alex_voice_fallback_events;
CREATE POLICY "Admins read voice fallback events" ON public.alex_voice_fallback_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Anyone can read voice quality logs" ON public.alex_voice_quality_logs;
CREATE POLICY "Admins read voice quality logs" ON public.alex_voice_quality_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Anyone can read render logs" ON public.alex_voice_render_logs;
CREATE POLICY "Admins read render logs" ON public.alex_voice_render_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "anyone_can_read_own_scores" ON public.entrepreneur_scores;
DROP POLICY IF EXISTS "Anyone can read own session" ON public.lead_capture_sessions;
CREATE POLICY "Admins read lead capture sessions" ON public.lead_capture_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read entrepreneur scores" ON public.entrepreneur_scores
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
