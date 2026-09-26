-- Une fiche publiée sans adresse publique restait inaccessible: la synchronisation
-- ne se déclenchait que sur le changement de publication, jamais sur l'ajout tardif du slug.
CREATE OR REPLACE FUNCTION public.sync_contractor_public_page()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_published IS DISTINCT FROM COALESCE(OLD.is_published, false)
     OR NEW.slug IS DISTINCT FROM OLD.slug THEN
    IF NEW.is_published = true AND NEW.slug IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.contractor_public_pages WHERE contractor_id = NEW.id) THEN
        UPDATE public.contractor_public_pages
           SET slug = COALESCE(slug, NEW.slug),
               is_published = true,
               published_at = COALESCE(published_at, now()),
               updated_at = now()
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
END $function$;

-- Backfill des fiches publiées sans page publique correspondante
INSERT INTO public.contractor_public_pages (contractor_id, slug, is_published, published_at)
SELECT c.id, c.slug, true, now()
FROM public.contractors c
LEFT JOIN public.contractor_public_pages pp ON pp.contractor_id = c.id
WHERE coalesce(c.is_published, false) = true
  AND c.slug IS NOT NULL
  AND pp.id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.contractor_public_pages x WHERE x.slug = c.slug);