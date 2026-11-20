-- v2 free audit
DROP POLICY IF EXISTS "Anyone can insert audits" ON public.aipp_audits;
DROP POLICY IF EXISTS "Anyone can view audits" ON public.aipp_audits;
CREATE POLICY "Visitors create own audits" ON public.aipp_audits FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND length(domain) BETWEEN 1 AND 255 AND status = 'pending');
CREATE POLICY "Read anonymous or own audits" ON public.aipp_audits FOR SELECT TO anon, authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can insert audit entities" ON public.aipp_audit_entities;
DROP POLICY IF EXISTS "Anyone can view audit entities" ON public.aipp_audit_entities;
CREATE POLICY "Read entities of readable audits" ON public.aipp_audit_entities FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.aipp_audits a WHERE a.id = aipp_audit_entities.audit_id
    AND (a.user_id IS NULL OR a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))));

DROP POLICY IF EXISTS "Service role can insert audit recommendations" ON public.aipp_audit_recommendations;
DROP POLICY IF EXISTS "Anyone can view audit recommendations" ON public.aipp_audit_recommendations;
CREATE POLICY "Read recommendations of readable audits" ON public.aipp_audit_recommendations FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.aipp_audits a WHERE a.id = aipp_audit_recommendations.audit_id
    AND (a.user_id IS NULL OR a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))));

DROP POLICY IF EXISTS "Service role can insert audit scores" ON public.aipp_audit_scores;
DROP POLICY IF EXISTS "Anyone can view audit scores" ON public.aipp_audit_scores;
CREATE POLICY "Read scores of readable audits" ON public.aipp_audit_scores FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.aipp_audits a WHERE a.id = aipp_audit_scores.audit_id
    AND (a.user_id IS NULL OR a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))));

-- server-only writers
DROP POLICY IF EXISTS "Anyone can insert voice fallback events" ON public.alex_voice_fallback_events;

DROP POLICY IF EXISTS "import_scores_write_all" ON public.contractor_import_scores;
DROP POLICY IF EXISTS "import_scores_read_all" ON public.contractor_import_scores;
CREATE POLICY "Owners read import scores" ON public.contractor_import_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.contractor_import_runs r WHERE r.id = contractor_import_scores.run_id AND r.user_id = auth.uid()));

-- job history / lead scores scoped to matched contractor
DROP POLICY IF EXISTS "Authenticated read logs" ON public.job_status_logs;
DROP POLICY IF EXISTS "System insert logs" ON public.job_status_logs;
CREATE POLICY "Matched contractor reads job logs" ON public.job_status_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.contractor_matches m JOIN public.contractors c ON c.id = m.contractor_id
    WHERE m.request_id = job_status_logs.request_id AND c.user_id = auth.uid()));
CREATE POLICY "Matched contractor adds job logs" ON public.job_status_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR (actor_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.contractor_matches m JOIN public.contractors c ON c.id = m.contractor_id
    WHERE m.request_id = job_status_logs.request_id AND c.user_id = auth.uid())));

DROP POLICY IF EXISTS "Authenticated read scores" ON public.lead_scores;
CREATE POLICY "Matched contractor reads lead scores" ON public.lead_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.contractor_matches m JOIN public.contractors c ON c.id = m.contractor_id
    WHERE m.request_id = lead_scores.request_id AND c.user_id = auth.uid()));

-- referral progress
DROP POLICY IF EXISTS "System can upsert progress" ON public.referral_progress;
CREATE POLICY "Users create own progress" ON public.referral_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- browser telemetry: bounded, well-formed writes only
DROP POLICY IF EXISTS "Anyone can insert pronunciation logs" ON public.alex_voice_pronunciation_logs;
CREATE POLICY "Bounded pronunciation logs" ON public.alex_voice_pronunciation_logs FOR INSERT TO anon, authenticated
  WITH CHECK (length(original_text) <= 5000 AND length(transformed_text) <= 5000 AND length(locale) <= 16
    AND (voice_session_id IS NULL OR length(voice_session_id) <= 128)
    AND (applied_rules_json IS NULL OR pg_column_size(applied_rules_json) <= 8192));

DROP POLICY IF EXISTS "Anyone can insert voice quality logs" ON public.alex_voice_quality_logs;
CREATE POLICY "Bounded voice quality logs" ON public.alex_voice_quality_logs FOR INSERT TO anon, authenticated
  WITH CHECK (length(metric_key) BETWEEN 1 AND 100 AND (quality_level IS NULL OR length(quality_level) <= 40)
    AND (notes IS NULL OR length(notes) <= 2000));

DROP POLICY IF EXISTS "Anyone can insert render logs" ON public.alex_voice_render_logs;
CREATE POLICY "Bounded render logs" ON public.alex_voice_render_logs FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid())
    AND (text_input IS NULL OR length(text_input) <= 8000)
    AND (text_preprocessed IS NULL OR length(text_preprocessed) <= 8000)
    AND (error_message IS NULL OR length(error_message) <= 4000)
    AND (profile_key IS NULL OR length(profile_key) <= 100)
    AND (language_code IS NULL OR length(language_code) <= 16));

DROP POLICY IF EXISTS "Anyone can insert voice errors" ON public.voice_session_errors;
CREATE POLICY "Bounded voice errors" ON public.voice_session_errors FOR INSERT TO anon, authenticated
  WITH CHECK (length(session_id) BETWEEN 1 AND 128 AND length(error_type) BETWEEN 1 AND 100
    AND (error_message IS NULL OR length(error_message) <= 4000)
    AND (error_payload IS NULL OR pg_column_size(error_payload) <= 16384));

DROP POLICY IF EXISTS "Anyone can insert state transitions" ON public.voice_session_state_transitions;
CREATE POLICY "Bounded state transitions" ON public.voice_session_state_transitions FOR INSERT TO anon, authenticated
  WITH CHECK (length(session_id) BETWEEN 1 AND 128 AND length(to_state) BETWEEN 1 AND 100
    AND (from_state IS NULL OR length(from_state) <= 100)
    AND (transition_reason IS NULL OR length(transition_reason) <= 1000));

DROP POLICY IF EXISTS "Anyone can insert lead sessions" ON public.lead_capture_sessions;
CREATE POLICY "Bounded ad landing sessions" ON public.lead_capture_sessions FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'started' AND (device_type IS NULL OR device_type IN ('mobile','desktop'))
    AND (source_channel IS NULL OR length(source_channel) <= 120)
    AND (campaign_name IS NULL OR length(campaign_name) <= 200)
    AND (landing_variant IS NULL OR length(landing_variant) <= 60));

DROP POLICY IF EXISTS "anyone_can_insert_scores" ON public.entrepreneur_scores;
CREATE POLICY "Bounded landing scores" ON public.entrepreneur_scores FOR INSERT TO anon, authenticated
  WITH CHECK (score BETWEEN 0 AND 100
    AND (opportunities_min IS NULL OR opportunities_min >= 0)
    AND (opportunities_max IS NULL OR opportunities_max >= 0)
    AND (ai_visibility IS NULL OR length(ai_visibility) <= 60)
    AND (component_scores IS NULL OR pg_column_size(component_scores) <= 4096));