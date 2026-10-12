-- Restrict internal configuration/ops tables to admins (scanner: RLS tautology). Frontend does not read these except admin pages; edge functions use the service role.
DROP POLICY IF EXISTS "affiliate_settings read authenticated" ON public.affiliate_settings;
DROP POLICY IF EXISTS "Authenticated read voice experiments" ON public.alex_voice_experiments;
DROP POLICY IF EXISTS "Authenticated read voice promotion history" ON public.alex_voice_promotion_history;
DROP POLICY IF EXISTS "Auth users can view targets" ON public.contractor_generation_targets;
DROP POLICY IF EXISTS "Auth users can view scraping jobs" ON public.scraping_generation_jobs;
DROP POLICY IF EXISTS "sit_authenticated_read" ON public.system_integrity_thresholds;
DROP POLICY IF EXISTS "Anyone authenticated can read provider configs" ON public.voice_provider_configs;
DROP POLICY IF EXISTS "system_settings read authenticated" ON public.system_settings;
CREATE POLICY "system_settings admin read" ON public.system_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "generation_logs read authenticated" ON public.territory_generation_logs;
CREATE POLICY "generation_logs admin read" ON public.territory_generation_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Authenticated can read message variants" ON public.sniper_message_variants;
CREATE POLICY "message variants admin read" ON public.sniper_message_variants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Anon can read own runtime logs" ON public.voice_runtime_logs;
CREATE POLICY "runtime logs admin read" ON public.voice_runtime_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));