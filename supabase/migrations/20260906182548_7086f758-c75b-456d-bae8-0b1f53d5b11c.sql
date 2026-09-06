-- Finding: /activer/:slug always rendered "lien invalide" for anonymous visitors.
-- Root cause: v_sms_sprint_landing is security_invoker=true over sms_sprint_prospects,
-- whose only RLS policy is admin-only. The view already projects a safe, minimal
-- column set (no phone, no email), so run it with definer semantics instead of
-- widening RLS on the base table.
ALTER VIEW public.v_sms_sprint_landing SET (security_invoker = false);

GRANT SELECT ON public.v_sms_sprint_landing TO anon;
GRANT SELECT ON public.v_sms_sprint_landing TO authenticated;
GRANT ALL ON public.v_sms_sprint_landing TO service_role;