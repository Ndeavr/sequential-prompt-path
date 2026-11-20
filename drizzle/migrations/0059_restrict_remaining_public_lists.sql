-- categories
DROP POLICY IF EXISTS "categories read authenticated" ON public.categories;
CREATE POLICY "Active categories readable" ON public.categories FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- lead packs
DROP POLICY IF EXISTS "Anyone can read lead_packs" ON public.lead_packs;
CREATE POLICY "Active lead packs readable" ON public.lead_packs FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- role permissions
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.role_permissions;
CREATE POLICY "Users read permissions of own roles" ON public.role_permissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = role_permissions.role_code));

-- contractor category assignments
DROP POLICY IF EXISTS "contractor_category_public_read" ON public.contractor_category_assignments;
CREATE POLICY "Categories of verified contractors readable" ON public.contractor_category_assignments FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_category_assignments.contractor_id
    AND c.verification_status = 'verified'::verification_status));

-- contractor brand profiles
DROP POLICY IF EXISTS "contractor_brand_profiles_public_read" ON public.contractor_brand_profiles;
CREATE POLICY "Brands of verified or own contractors readable" ON public.contractor_brand_profiles FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_brand_profiles.contractor_id
    AND (c.verification_status = 'verified'::verification_status OR c.user_id = auth.uid())));

-- contractor aipp audits
DROP POLICY IF EXISTS "Anyone can view aipp audits" ON public.contractor_aipp_audits;
CREATE POLICY "Owners read own aipp audits" ON public.contractor_aipp_audits FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_aipp_audits.contractor_id AND c.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.aipp_audit_poll_status(_audit_id uuid)
RETURNS TABLE(analysis_status text, overall_score numeric, confidence_level text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.analysis_status::text, a.overall_score, a.confidence_level::text
  FROM public.contractor_aipp_audits a WHERE a.id = _audit_id
$$;
REVOKE ALL ON FUNCTION public.aipp_audit_poll_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aipp_audit_poll_status(uuid) TO anon, authenticated, service_role;

-- founder slots
DROP POLICY IF EXISTS "founder_slots_read_authenticated" ON public.founder_activation_slots;
CREATE POLICY "Admins read founder slots" ON public.founder_activation_slots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.founder_slots_summary()
RETURNS TABLE(remaining bigint, claimed bigint, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*) FILTER (WHERE status = 'open'),
         count(*) FILTER (WHERE status = ANY (ARRAY['reserved','active'])),
         count(*)
  FROM public.founder_activation_slots
$$;
REVOKE ALL ON FUNCTION public.founder_slots_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founder_slots_summary() TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.v_founder_slots_public WITH (security_invoker = true) AS
  SELECT s.remaining, s.claimed, s.total FROM public.founder_slots_summary() s;

-- likes
DROP POLICY IF EXISTS "Anyone can view likes" ON public.user_likes;
CREATE POLICY "Users read own likes" ON public.user_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.like_count(_entity_type text, _entity_id text)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*) FROM public.user_likes WHERE entity_type = _entity_type AND entity_id = _entity_id
$$;
REVOKE ALL ON FUNCTION public.like_count(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.like_count(text, text) TO anon, authenticated, service_role;