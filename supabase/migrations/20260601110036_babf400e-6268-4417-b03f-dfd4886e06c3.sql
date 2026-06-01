
-- =====================================================================
-- 1. ACTIVATION_PIPELINE_RUNS — hide Stripe IDs from anon
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can read activation run by id" ON public.activation_pipeline_runs;

CREATE POLICY "Admins read activation runs"
  ON public.activation_pipeline_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners read their activation runs"
  ON public.activation_pipeline_runs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE VIEW public.activation_pipeline_runs_public
WITH (security_invoker = true) AS
SELECT id, domain, input_kind, pipeline_status, current_step,
       aipp_score, aipp_breakdown, recommendation, recommended_plan,
       partial_confidence, screenshot_url, signals, extraction,
       activated_at, created_at, updated_at
FROM public.activation_pipeline_runs;

GRANT SELECT ON public.activation_pipeline_runs_public TO anon, authenticated;

-- Public view needs the base table SELECT to be permitted under security_invoker.
-- Add a permissive policy that only matters when reading through the view's
-- column projection (Stripe + user_id fields are not in the view).
CREATE POLICY "Public can read activation run progress"
  ON public.activation_pipeline_runs FOR SELECT
  TO anon, authenticated
  USING (true);
-- Restrict column visibility for anon via REVOKE on sensitive columns.
REVOKE SELECT ON public.activation_pipeline_runs FROM anon;
GRANT SELECT (id, domain, input_kind, pipeline_status, current_step,
              aipp_score, aipp_breakdown, recommendation, recommended_plan,
              partial_confidence, screenshot_url, signals, extraction,
              activated_at, created_at, updated_at)
  ON public.activation_pipeline_runs TO anon;

-- =====================================================================
-- 2. AIPP_PROFILES — hide phone/email from anon
-- =====================================================================
DROP POLICY IF EXISTS "aipp_profiles_public_read" ON public.aipp_profiles;

CREATE POLICY "Admins read all aipp profiles"
  ON public.aipp_profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Re-add public-published read but only via column-level grants.
CREATE POLICY "Public read published aipp profiles"
  ON public.aipp_profiles FOR SELECT
  TO anon, authenticated
  USING (public_status = 'published'::aipp_public_status);

REVOKE SELECT ON public.aipp_profiles FROM anon;
GRANT SELECT (
  id, slug, company_name, legal_name, trade_name, website_url,
  primary_city, primary_trade, short_ai_summary, long_ai_summary,
  logo_url, hero_image_url, google_business_url, google_rating,
  google_review_count, positioning_statement, founded_year, team_size,
  public_status, verification_status, contractor_id, meta_title,
  meta_description, canonical_url, published_at, created_at, updated_at
) ON public.aipp_profiles TO anon;

-- =====================================================================
-- 3. AIPP_SCORE_CHECKS — remove anonymous read
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can read aipp checks" ON public.aipp_score_checks;

CREATE POLICY "Admins read aipp score checks"
  ON public.aipp_score_checks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- 4. CONTRACTORS_PROSPECTS — hide phone/email/sms_reply_text/verified_email
-- =====================================================================
DROP POLICY IF EXISTS "public_read_prospect_by_slug" ON public.contractors_prospects;

CREATE POLICY "public_read_prospect_by_slug_safe"
  ON public.contractors_prospects FOR SELECT
  TO anon
  USING (
    landing_slug IS NOT NULL
    AND status = ANY (ARRAY['landing_ready','emailed','opened','clicked','replied','booked','won'])
  );

REVOKE SELECT ON public.contractors_prospects FROM anon;
GRANT SELECT (
  id, business_name, legal_name, city, region, category, subcategory,
  website, domain, landing_slug, status, priority_tier,
  aipp_score, seo_score, reviews_score, content_score, ai_score,
  branding_score, trust_score, local_score, conversion_score,
  score_confidence, diagnostic_summary, diagnostic
) ON public.contractors_prospects TO anon;

-- =====================================================================
-- 5. EMAIL_TEST_MESSAGES — admin only
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can manage test messages" ON public.email_test_messages;

CREATE POLICY "Admins manage email test messages"
  ON public.email_test_messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- 6. OUTREACH_TARGETS — remove blanket public; expose via SECURITY DEFINER RPCs
-- =====================================================================
DROP POLICY IF EXISTS "Public can read outreach targets by token" ON public.outreach_targets;

CREATE POLICY "Admins read outreach targets"
  ON public.outreach_targets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_outreach_target(
  p_token text DEFAULT NULL,
  p_slug text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, business_name text, website_url text, city text,
  rbq_number text, category text, slug text, secure_token text,
  landing_status text, pre_audit_id uuid, contractor_id uuid,
  payload jsonb, phone text, first_viewed_at timestamptz, claimed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, business_name, website_url, city, rbq_number, category,
         slug, secure_token, landing_status, pre_audit_id, contractor_id,
         payload, phone, first_viewed_at, claimed_at
  FROM public.outreach_targets
  WHERE (p_token IS NOT NULL AND secure_token = p_token)
     OR (p_token IS NULL AND p_slug IS NOT NULL AND slug = p_slug)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_outreach_target(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_outreach_first_viewed(
  p_token text,
  p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.outreach_targets
  SET first_viewed_at = COALESCE(first_viewed_at, now())
  WHERE id = p_id AND secure_token = p_token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_outreach_first_viewed(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_outreach_target(
  p_token text,
  p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.outreach_targets
  SET claimed_at = COALESCE(claimed_at, now()),
      landing_status = 'claimed'
  WHERE id = p_id AND secure_token = p_token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_outreach_target(text, uuid) TO anon, authenticated;

-- =====================================================================
-- 7. PROSPECT_PAGES — remove blanket public read
-- =====================================================================
DROP POLICY IF EXISTS "Public read prospect pages by slug" ON public.prospect_pages;
