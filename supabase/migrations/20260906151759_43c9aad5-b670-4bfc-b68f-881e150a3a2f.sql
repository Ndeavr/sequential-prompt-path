REVOKE EXECUTE ON FUNCTION public.public_contractor_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_contractor_credentials(uuid) TO service_role;