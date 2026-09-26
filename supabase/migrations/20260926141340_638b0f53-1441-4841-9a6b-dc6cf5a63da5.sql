CREATE OR REPLACE FUNCTION public.get_contractor_public_profile(_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  cid uuid;
BEGIN
  SELECT c.id INTO cid
  FROM public.contractors c
  JOIN public.contractor_public_pages pp ON pp.contractor_id = c.id
  WHERE (c.slug = _slug OR pp.slug = _slug) AND pp.is_published = true AND c.is_published = true
  LIMIT 1;

  IF cid IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'contractor', jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'business_name', c.business_name,
      'legal_name', c.legal_name,
      'specialty', c.specialty,
      'description', c.description,
      'city', c.city,
      'province', c.province,
      'logo_url', c.logo_url,
      'portfolio_urls', c.portfolio_urls,
      'rating', c.rating,
      'review_count', c.review_count,
      'aipp_score', c.aipp_score,
      'years_experience', c.years_experience,
      'website', c.website,
      'phone', c.phone,
      'google_business_url', c.google_business_url,
      'facebook_page_url', c.facebook_page_url,
      'license_number', c.license_number,
      'rbq_number', c.rbq_number,
      'neq', c.neq,
      'rbq_compliance_status', c.rbq_compliance_status,
      'service_areas', c.service_areas,
      'services_structured', c.services_structured,
      'mission', c.mission,
      'approach', c.approach,
      'values_text', c.values_text,
      'compatibility', c.compatibility,
      'travel_radius_km', c.travel_radius_km,
      'availability_estimate', c.availability_estimate,
      'public_status', c.public_status,
      'is_published', c.is_published,
      'is_discoverable', c.is_discoverable,
      'is_accepting_appointments', c.is_accepting_appointments,
      'booking_enabled', c.booking_enabled,
      'booking_page_published', c.booking_page_published,
      'booking_mode', c.booking_mode,
      'booking_timezone', c.booking_timezone,
      'booking_min_notice_hours', c.booking_min_notice_hours,
      'booking_horizon_days', c.booking_horizon_days,
      'published_at', c.published_at,
      'created_at', c.created_at
    ),
    'ai_profile', (SELECT jsonb_build_object(
        'summary_fr', ai.summary_fr,
        'summary_en', ai.summary_en,
        'best_for', ai.best_for,
        'not_ideal_for', ai.not_ideal_for,
        'recommendation_reasons', ai.recommendation_reasons,
        'personality_tags', ai.personality_tags
      ) FROM public.contractor_ai_profiles ai WHERE ai.contractor_id = cid AND ai.is_current = true LIMIT 1),
    'services', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'service_name_fr', s.service_name_fr,
        'service_name_en', s.service_name_en,
        'category', s.category,
        'description_fr', s.description_fr,
        'is_primary', s.is_primary,
        'display_order', s.display_order
      ) ORDER BY s.display_order) FROM public.contractor_services s WHERE s.contractor_id = cid AND s.is_active = true), '[]'),
    'service_areas', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', sa.id,
        'city_name', sa.city_name,
        'city_slug', sa.city_slug,
        'province', sa.province,
        'is_primary', sa.is_primary,
        'radius_km', sa.radius_km
      )) FROM public.contractor_service_areas sa WHERE sa.contractor_id = cid), '[]'),
    'media', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'media_type', m.media_type,
        'public_url', m.public_url,
        'title', m.title,
        'alt_text', m.alt_text,
        'is_featured', m.is_featured,
        'display_order', m.display_order
      ) ORDER BY m.display_order) FROM public.contractor_media m WHERE m.contractor_id = cid AND m.is_approved = true), '[]'),
    'credentials', COALESCE((SELECT jsonb_agg(row_to_json(cr)) FROM public.public_contractor_credentials(cid) cr), '[]'),
    'public_page', (SELECT jsonb_build_object(
        'slug', pp.slug,
        'seo_title', pp.seo_title,
        'seo_description', pp.seo_description,
        'canonical_url', pp.canonical_url,
        'og_image_url', pp.og_image_url,
        'faq', pp.faq,
        'custom_sections', pp.custom_sections,
        'is_published', pp.is_published,
        'published_at', pp.published_at
      ) FROM public.contractor_public_pages pp WHERE pp.contractor_id = cid LIMIT 1),
    'problem_links', COALESCE((SELECT jsonb_agg(jsonb_build_object('problem_id', pl.problem_id, 'relevance', pl.relevance_score)) FROM public.contractor_problem_links pl WHERE pl.contractor_id = cid), '[]'),
    'comparables', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', comp.comparable_contractor_id, 'similarity', comp.similarity_score, 'name', cc.business_name, 'slug', cc.slug) ORDER BY comp.similarity_score DESC) FROM public.contractor_comparables comp JOIN public.contractors cc ON cc.id = comp.comparable_contractor_id WHERE comp.contractor_id = cid), '[]')
  ) INTO result
  FROM public.contractors c
  WHERE c.id = cid;

  RETURN result;
END;
$function$;