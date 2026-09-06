-- Finding: public contractor profiles returned 401 (permission denied) for
-- anonymous visitors, which the UI degraded into "no verified credentials".
-- The function is already the curated public projection; restore least-privilege
-- EXECUTE for the roles that serve the public profile page.
GRANT EXECUTE ON FUNCTION public.get_contractor_public_profile(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_contractor_public_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contractor_public_profile(text) TO service_role;