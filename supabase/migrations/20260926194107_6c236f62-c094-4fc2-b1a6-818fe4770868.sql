REVOKE ALL ON FUNCTION public.ensure_contractor_public_slug(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_contractor_on_free_activation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_contractor_public_slug(uuid) TO service_role;