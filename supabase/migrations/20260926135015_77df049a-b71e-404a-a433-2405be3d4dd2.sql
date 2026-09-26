CREATE OR REPLACE FUNCTION public.get_contractor_public_profile(_slug text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
    'contractor', (to_jsonb(c)
       - 'user_id' - 'email' - 'admin_note' - 'reviewed_by' - 'reviewed_at'
       - 'internal_verified_score' - 'internal_verified_at' - 'internal_verified_by'
       - 'verification_notes' - 'normalized_business_name' - 'normalized_phone'
       - 'normalized_website' - 'booking_base_lat' - 'booking_base_lng'
       - 'google_calendar_id' - 'google_calendar_connected' - 'insurance_info'
       - 'recommended_plan_id' - 'ai_reference_cache' - 'postal_code' - 'address'),
    'ai_profile', (SELECT row_to_json(ai) FROM public.contractor_ai_profiles ai WHERE ai.contractor_id = cid AND ai.is_current = true LIMIT 1),
    'services', COALESCE((SELECT jsonb_agg(row_to_json(s) ORDER BY s.display_order) FROM public.contractor_services s WHERE s.contractor_id = cid AND s.is_active = true), '[]'),
    'service_areas', COALESCE((SELECT jsonb_agg(row_to_json(sa)) FROM public.contractor_service_areas sa WHERE sa.contractor_id = cid), '[]'),
    'media', COALESCE((SELECT jsonb_agg(row_to_json(m) ORDER BY m.display_order) FROM public.contractor_media m WHERE m.contractor_id = cid AND m.is_approved = true), '[]'),
    'credentials', COALESCE((SELECT jsonb_agg(row_to_json(cr)) FROM public.public_contractor_credentials(cid) cr), '[]'),
    'public_page', (SELECT row_to_json(pp) FROM public.contractor_public_pages pp WHERE pp.contractor_id = cid LIMIT 1),
    'problem_links', COALESCE((SELECT jsonb_agg(jsonb_build_object('problem_id', pl.problem_id, 'relevance', pl.relevance_score)) FROM public.contractor_problem_links pl WHERE pl.contractor_id = cid), '[]'),
    'comparables', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', comp.comparable_contractor_id, 'similarity', comp.similarity_score, 'name', cc.business_name, 'slug', cc.slug) ORDER BY comp.similarity_score DESC) FROM public.contractor_comparables comp JOIN public.contractors cc ON cc.id = comp.comparable_contractor_id WHERE comp.contractor_id = cid), '[]')
  ) INTO result
  FROM public.contractors c
  WHERE c.id = cid;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_contractor_public_page()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_published IS DISTINCT FROM COALESCE(OLD.is_published, false) THEN
    IF NEW.is_published = true AND NEW.slug IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.contractor_public_pages WHERE contractor_id = NEW.id) THEN
        UPDATE public.contractor_public_pages
           SET is_published = true, published_at = COALESCE(published_at, now()), updated_at = now()
         WHERE contractor_id = NEW.id;
      ELSIF NOT EXISTS (SELECT 1 FROM public.contractor_public_pages WHERE slug = NEW.slug) THEN
        INSERT INTO public.contractor_public_pages(contractor_id, slug, is_published, published_at)
        VALUES (NEW.id, NEW.slug, true, now());
      END IF;
    ELSIF NEW.is_published = false THEN
      UPDATE public.contractor_public_pages SET is_published = false, updated_at = now()
       WHERE contractor_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_contractor_public_page() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_contractor_public_page ON public.contractors;
CREATE TRIGGER trg_sync_contractor_public_page AFTER INSERT OR UPDATE OF is_published, slug ON public.contractors
FOR EACH ROW EXECUTE FUNCTION public.sync_contractor_public_page();