
-- Fix security definer on the new view
ALTER VIEW public.v_contractor_trust_summary SET (security_invoker = on);
