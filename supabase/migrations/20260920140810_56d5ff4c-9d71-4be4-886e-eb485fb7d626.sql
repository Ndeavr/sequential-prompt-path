GRANT EXECUTE ON FUNCTION public.owns_contractor(uuid) TO authenticated, service_role;

DROP INDEX IF EXISTS public.contractor_funnel_events_dedupe_key_uidx;
CREATE UNIQUE INDEX contractor_funnel_events_dedupe_key_uidx
  ON public.contractor_funnel_events (dedupe_key);