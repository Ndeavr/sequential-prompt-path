
-- Seed contractor_public_pages from contractors
INSERT INTO contractor_public_pages (contractor_id, slug, is_published, seo_title, seo_description)
SELECT 
  id,
  lower(regexp_replace(regexp_replace(
    coalesce(business_name, '') || '-' || coalesce(city, ''),
    '[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ]+', '-', 'g'
  ), '-+', '-', 'g')),
  true,
  coalesce(business_name, 'Entrepreneur') || ' — Entrepreneur vérifié | UNPRO',
  'Profil vérifié de ' || coalesce(business_name, 'Entrepreneur') || coalesce(' à ' || city, '') || '. Services, avis et disponibilité sur UNPRO.'
FROM contractors
WHERE business_name IS NOT NULL AND business_name != ''
ON CONFLICT (contractor_id) DO NOTHING;
