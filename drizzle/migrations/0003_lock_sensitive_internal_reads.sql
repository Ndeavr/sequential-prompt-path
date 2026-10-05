DROP POLICY IF EXISTS "Anyone can view their booking by token" ON public.booking_sessions;

DROP POLICY IF EXISTS "Authenticated can read coefficients" ON public.pricing_engine_coefficients;
CREATE POLICY "Admins read coefficients" ON public.pricing_engine_coefficients FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS growth_settings_public_read ON public.pricing_growth_settings;
CREATE POLICY growth_settings_admin_read ON public.pricing_growth_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS auth_select_runtime_payment_checks ON public.runtime_payment_checks;
DROP POLICY IF EXISTS auth_insert_runtime_payment_checks ON public.runtime_payment_checks;
CREATE POLICY admin_select_runtime_payment_checks ON public.runtime_payment_checks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY admin_insert_runtime_payment_checks ON public.runtime_payment_checks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read send queue" ON public.sniper_send_queue;
CREATE POLICY "Admins read send queue" ON public.sniper_send_queue FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated admins can read sniper targets" ON public.sniper_targets;
CREATE POLICY "Admins read sniper targets" ON public.sniper_targets FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- Public booking page only needs connection status; hide private calendar id.
REVOKE SELECT ON public.contractor_calendar_connections FROM anon, authenticated;
GRANT SELECT (id, contractor_id, provider, access_status, last_synced_at, created_at, updated_at) ON public.contractor_calendar_connections TO anon, authenticated;
GRANT ALL ON public.contractor_calendar_connections TO service_role;