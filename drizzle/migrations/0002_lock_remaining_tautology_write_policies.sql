-- Rollback: docs/migrations-staged/rollback_lock_remaining_tautology_write_policies.sql
-- Owner-scoped business data (contractor_id -> contractors.user_id), admins via has_role
ALTER POLICY "Users manage own business assets" ON public.business_assets TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()));
ALTER POLICY "Users manage own business entities" ON public.business_entities TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()));
ALTER POLICY "Users manage own import jobs" ON public.business_import_jobs TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()));
ALTER POLICY "Users manage own business locations" ON public.business_locations TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()));
ALTER POLICY "Users manage own business services" ON public.business_services TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()));
ALTER POLICY "Users manage own completion events" ON public.profile_completion_events TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()));
ALTER POLICY atos_public_update_self ON public.ai_trust_onboarding_sessions TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());

-- Status / offer / verification / internal tables: admins only (server functions use service role, bypass RLS)
ALTER POLICY "Public update steps" ON public.alex_score_reveal_steps TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can manage analyses" ON public.alex_visual_analyses TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can manage projections" ON public.alex_visual_projections TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can update voice sessions" ON public.alex_voice_sessions TO authenticated USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());
ALTER POLICY "Anyone can manage consents" ON public.contractor_import_consents TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER POLICY import_scores_update_all ON public.contractor_import_scores TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can manage script events" ON public.contractor_import_script_events TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anon can manage by conversation_id" ON public.conversation_activity_logs TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can update votes" ON public.design_votes TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can update profile fields" ON public.entrepreneur_profile_fields TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Authenticated users can reserve spots" ON public.founder_spots TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Authenticated users can update recruitment leads" ON public.recruitment_leads TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can update inputs" ON public.self_serve_goal_plan_inputs TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER POLICY "Anyone can update sessions" ON public.self_serve_goal_plan_sessions TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER POLICY auth_update_verification_failures ON public.verification_failures TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER POLICY auth_update_verification_runs ON public.verification_runs TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER POLICY auth_update_verification_steps ON public.verification_steps TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Anonymous telemetry: recent rows only, telemetry columns only
ALTER POLICY "Anyone can update their own session" ON public.lead_funnel_sessions TO anon, authenticated
  USING (created_at > now() - interval '1 day') WITH CHECK (created_at > now() - interval '1 day');
REVOKE UPDATE ON public.lead_funnel_sessions FROM anon, authenticated;
GRANT UPDATE (time_on_page, scroll_depth, last_seen_at, cta_clicked, cta_clicked_at, alex_started, alex_started_at, signup_started, signup_started_at, metadata, updated_at) ON public.lead_funnel_sessions TO anon, authenticated;

-- Demo flow: recent rows, cannot self-mark as paid, no Stripe/price tampering
ALTER POLICY demo_isr_update_any ON public.demo_contractor_plan_tests TO anon, authenticated
  USING (created_at > now() - interval '1 day')
  WITH CHECK (created_at > now() - interval '1 day' AND coalesce(payment_status,'') NOT IN ('paid','succeeded','completed','complete'));
REVOKE UPDATE ON public.demo_contractor_plan_tests FROM anon, authenticated;
GRANT UPDATE (updated_at, selected_capacity, selected_territory, selected_project_type, selected_objective, wants_ai_priority, recommended_plan, promo_code, payment_status, flow_status, raw_answers, metadata) ON public.demo_contractor_plan_tests TO anon, authenticated;