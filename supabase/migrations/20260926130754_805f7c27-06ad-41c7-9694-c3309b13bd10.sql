CREATE OR REPLACE FUNCTION public.contractor_plan_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.canonical_plan_code(cs.plan_id)
  FROM public.contractors c
  JOIN public.contractor_subscriptions cs ON cs.contractor_id = c.id
  WHERE c.user_id = _user_id
    AND (auth.uid() IS NULL OR auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin'))
    AND cs.status IN ('active', 'trialing', 'past_due')
  ORDER BY cs.updated_at DESC
  LIMIT 1
$$;