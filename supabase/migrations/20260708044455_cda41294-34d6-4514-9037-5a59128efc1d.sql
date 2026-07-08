
-- 1. Deactivate junk profiles (business_name is an email AND no city)
UPDATE public.contractors
SET account_status = 'inactive', updated_at = now()
WHERE account_status = 'active'
  AND (business_name ILIKE '%@%' OR business_name IS NULL)
  AND city IS NULL;

-- 2. Auto-sync booking flags when is_accepting_appointments flips on
CREATE OR REPLACE FUNCTION public.sync_contractor_booking_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_accepting_appointments = true
     AND (OLD IS NULL OR OLD.is_accepting_appointments IS DISTINCT FROM NEW.is_accepting_appointments) THEN
    NEW.booking_enabled := true;
    NEW.booking_page_published := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_contractor_booking_flags ON public.contractors;
CREATE TRIGGER trg_sync_contractor_booking_flags
BEFORE INSERT OR UPDATE OF is_accepting_appointments ON public.contractors
FOR EACH ROW EXECUTE FUNCTION public.sync_contractor_booking_flags();

-- Backfill current accepting contractors
UPDATE public.contractors
SET booking_enabled = true, booking_page_published = true, updated_at = now()
WHERE account_status = 'active'
  AND is_accepting_appointments = true
  AND (booking_enabled = false OR booking_page_published = false);

-- 3. Backfill contractor_service_areas from city
INSERT INTO public.contractor_service_areas (contractor_id, city_name, city_slug, province, is_primary, data_source, validation_status)
SELECT c.id,
       c.city,
       lower(regexp_replace(unaccent(c.city), '[^a-zA-Z0-9]+', '-', 'g')),
       'QC',
       true,
       'backfill_from_city',
       'auto'
FROM public.contractors c
WHERE c.account_status = 'active'
  AND c.city IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contractor_service_areas sa WHERE sa.contractor_id = c.id
  );

-- 4. Backfill contractor_category_assignments from specialty text
WITH mapping(pattern, slug) AS (
  VALUES
    ('plomb',        'plomberie'),
    ('électric',     'electricite'),
    ('electric',     'electricite'),
    ('toiture',      'toiture'),
    ('couvreur',     'toiture'),
    ('peinture',     'peinture'),
    ('rénovation',   'renovation-generale'),
    ('renovation',   'renovation-generale'),
    ('entrepreneur général', 'renovation-generale'),
    ('cuisine',      'renovation-generale'),
    ('salle de bain','renovation-generale'),
    ('hvac',         'cvc-chauffage'),
    ('climatisation','cvc-chauffage'),
    ('chauffage',    'cvc-chauffage'),
    ('isolation',    'isolation'),
    ('entretoit',    'isolation-entretoits'),
    ('carrelage',    'plancher'),
    ('menuiserie',   'menuiserie'),
    ('maçonnerie',   'maconnerie'),
    ('fenêtre',      'fenestration'),
    ('paysag',       'paysagement')
),
contractor_specs AS (
  SELECT c.id AS contractor_id,
         lower(unaccent(
           CASE
             WHEN pg_typeof(c.specialty)::text = 'text[]' THEN array_to_string(c.specialty::text[], ' ')
             ELSE c.specialty::text
           END
         )) AS spec_text
  FROM public.contractors c
  WHERE c.account_status = 'active' AND c.specialty IS NOT NULL
),
matches AS (
  SELECT DISTINCT cs.contractor_id, sc.id AS category_id
  FROM contractor_specs cs
  JOIN mapping m ON cs.spec_text LIKE '%' || lower(unaccent(m.pattern)) || '%'
  JOIN public.service_categories sc ON sc.slug = m.slug
)
INSERT INTO public.contractor_category_assignments (contractor_id, category_id, is_primary, assignment_source, admin_approved)
SELECT m.contractor_id, m.category_id, false, 'backfill_from_specialty', true
FROM matches m
WHERE NOT EXISTS (
  SELECT 1 FROM public.contractor_category_assignments a
  WHERE a.contractor_id = m.contractor_id AND a.category_id = m.category_id
);
