REVOKE ALL ON FUNCTION public.fn_match_waiting_demand(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_match_waiting_demand(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_match_waiting_demand(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_match_waiting_demand(uuid) TO service_role;