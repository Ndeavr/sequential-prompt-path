CREATE OR REPLACE FUNCTION public.contractor_visible_to_caller(_contractor_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = _contractor_id
    AND (c.verification_status = 'verified'::verification_status OR (auth.uid() IS NOT NULL AND c.user_id = auth.uid())))
$$;
REVOKE ALL ON FUNCTION public.contractor_visible_to_caller(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contractor_visible_to_caller(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Categories of verified contractors readable" ON public.contractor_category_assignments;
CREATE POLICY "Categories of verified contractors readable" ON public.contractor_category_assignments FOR SELECT TO anon, authenticated
  USING (public.contractor_visible_to_caller(contractor_id));

DROP POLICY IF EXISTS "Brands of verified or own contractors readable" ON public.contractor_brand_profiles;
CREATE POLICY "Brands of verified or own contractors readable" ON public.contractor_brand_profiles FOR SELECT TO anon, authenticated
  USING (public.contractor_visible_to_caller(contractor_id));