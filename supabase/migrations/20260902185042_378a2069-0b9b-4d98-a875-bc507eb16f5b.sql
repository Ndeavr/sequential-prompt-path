
-- P0.1 : ne plus exposer les codes promo aux visiteurs anonymes
DROP POLICY IF EXISTS "Anyone can read active promo_codes" ON public.promo_codes;
REVOKE SELECT ON public.promo_codes FROM anon;

-- P0.2 : tables internes sans policy -> pas de grant authenticated
REVOKE ALL ON public.internal_agent_tokens FROM authenticated, anon;
REVOKE ALL ON public.private_access_attempts FROM authenticated, anon;
REVOKE ALL ON public.private_access_slugs FROM authenticated, anon;
GRANT ALL ON public.internal_agent_tokens TO service_role;
GRANT ALL ON public.private_access_attempts TO service_role;
GRANT ALL ON public.private_access_slugs TO service_role;
