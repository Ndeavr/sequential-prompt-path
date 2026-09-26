GRANT EXECUTE ON FUNCTION public.contractor_feature_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_feature_access(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.contractor_plan_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_plan_code(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.canonical_plan_code(text) TO authenticated, anon, service_role;