-- 1. Remove the dangerous anon SELECT policy on contractor_leads
DROP POLICY IF EXISTS "Anon can read leads by id" ON public.contractor_leads;

-- 2. Convert all public views to SECURITY INVOKER
ALTER VIEW public.v_contractor_public_profile SET (security_invoker = true);
ALTER VIEW public.v_match_results_safe SET (security_invoker = true);
ALTER VIEW public.ccai_answer_matrix SET (security_invoker = true);
ALTER VIEW public.dna_profile_summary SET (security_invoker = true);
ALTER VIEW public.v_contractor_full_public SET (security_invoker = true);
ALTER VIEW public.v_contractor_trust_summary SET (security_invoker = true);
ALTER VIEW public.v_property_map_markers SET (security_invoker = true);
ALTER VIEW public.v_renovation_activity_map SET (security_invoker = true);
ALTER VIEW public.v_territories SET (security_invoker = true);
ALTER VIEW public.vw_jve_trade_estimation_defaults SET (security_invoker = true);
ALTER VIEW public.screenshot_analytics_daily SET (security_invoker = true);
ALTER VIEW public.screenshot_top_screens SET (security_invoker = true);
ALTER VIEW public.screenshot_conversion_summary SET (security_invoker = true);
ALTER VIEW public.screenshot_role_breakdown SET (security_invoker = true);
ALTER VIEW public.screen_friction_summary SET (security_invoker = true);
ALTER VIEW public.screenshot_alert_summary SET (security_invoker = true);
ALTER VIEW public.screenshot_recommendation_summary SET (security_invoker = true);