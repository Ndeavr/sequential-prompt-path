-- Next distinct batch of 10 approved projects (keyset on published_at, id), same safe columns as public_portfolio_feed().
CREATE OR REPLACE FUNCTION public.public_portfolio_feed_before(p_before_published_at timestamptz, p_before_id uuid)
RETURNS TABLE(id uuid, title text, service_name text, city text, description text, photo_paths text[],
              before_path text, after_path text, company_name text, author_verified boolean, published_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.service_name, p.city, p.description,
         ARRAY(SELECT jsonb_array_elements_text(p.gallery_urls)),
         p.before_image_url, p.after_image_url,
         CASE WHEN p.show_company_name THEN c.business_name END,
         coalesce(c.public_status = 'verified_active', false),
         p.published_at
  FROM public.contractor_portfolio_projects p
  JOIN public.contractors c ON c.id = p.contractor_id
  WHERE p.status = 'approved' AND p.published_at IS NOT NULL
    AND (p.published_at, p.id) < (p_before_published_at, p_before_id)
  ORDER BY p.published_at DESC, p.id DESC
  LIMIT 10;
$$;
REVOKE ALL ON FUNCTION public.public_portfolio_feed_before(timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_portfolio_feed_before(timestamptz, uuid) TO anon, authenticated, service_role;

-- Align first-batch tie-break with keyset order (published_at DESC, id DESC).
CREATE OR REPLACE FUNCTION public.public_portfolio_feed()
RETURNS TABLE(id uuid, title text, service_name text, city text, description text, photo_paths text[],
              before_path text, after_path text, company_name text, author_verified boolean, published_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.service_name, p.city, p.description,
         ARRAY(SELECT jsonb_array_elements_text(p.gallery_urls)),
         p.before_image_url, p.after_image_url,
         CASE WHEN p.show_company_name THEN c.business_name END,
         coalesce(c.public_status = 'verified_active', false),
         p.published_at
  FROM public.contractor_portfolio_projects p
  JOIN public.contractors c ON c.id = p.contractor_id
  WHERE p.status = 'approved' AND p.published_at IS NOT NULL
  ORDER BY p.published_at DESC, p.id DESC
  LIMIT 10;
$$;