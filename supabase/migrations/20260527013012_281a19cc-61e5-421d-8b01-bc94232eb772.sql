CREATE OR REPLACE FUNCTION public.create_outbound_landing_for_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_company record;
  v_slug text;
  v_token text;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM public.outbound_landing_pages WHERE lead_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, company_slug, company_name, city, specialty, trade
    INTO v_company
    FROM public.outbound_companies
    WHERE id = NEW.company_id;

  IF v_company.id IS NULL THEN
    RETURN NEW;
  END IF;

  v_slug := COALESCE(v_company.company_slug, 'pro')
            || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  v_token := replace(replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.outbound_landing_pages (
    company_id, lead_id, page_slug, landing_token,
    city, specialty, language, page_status
  ) VALUES (
    v_company.id, NEW.id, v_slug, v_token,
    v_company.city, COALESCE(v_company.specialty, v_company.trade), 'fr', 'live'
  )
  ON CONFLICT (page_slug) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block lead insertion because of landing page creation
  RAISE WARNING 'create_outbound_landing_for_lead failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Ensure pgcrypto exists for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Backfill: create leads for the 64 companies that have mission_id but no lead
INSERT INTO public.outbound_leads (company_id, mission_id, company_name, phone, website_url, domain, specialty, crm_status, pipeline_stage)
SELECT c.id, c.mission_id, c.company_name, c.phone, c.website_url,
       CASE WHEN c.website_url IS NOT NULL THEN regexp_replace(c.website_url, '^https?://([^/]+).*$', '\1') END,
       COALESCE(c.specialty, c.trade), 'new', 'scraped'
FROM public.outbound_companies c
LEFT JOIN public.outbound_leads l ON l.company_id = c.id
WHERE c.mission_id IS NOT NULL AND l.id IS NULL;