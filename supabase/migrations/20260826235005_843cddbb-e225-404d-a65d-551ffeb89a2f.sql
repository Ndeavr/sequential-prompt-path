REVOKE ALL ON public.internal_agent_tokens FROM anon;
REVOKE ALL ON public.private_access_slugs FROM anon;
REVOKE ALL ON public.private_access_attempts FROM anon;
GRANT ALL ON public.internal_agent_tokens TO service_role;
GRANT ALL ON public.private_access_slugs TO service_role;
GRANT ALL ON public.private_access_attempts TO service_role;