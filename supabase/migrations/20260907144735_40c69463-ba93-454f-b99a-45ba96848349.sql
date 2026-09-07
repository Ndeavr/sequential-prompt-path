INSERT INTO public.founder_eligible_categories (slug, name_fr, group_type, is_active)
VALUES
  ('grand-menage', 'Grand ménage', 'local_service', true),
  ('nettoyage-apres-construction', 'Nettoyage après construction ou rénovation', 'local_service', true),
  ('nettoyage-tapis', 'Nettoyage de tapis et carpettes', 'local_service', true),
  ('nettoyage-mobilier', 'Nettoyage de mobilier et tissus d''ameublement', 'local_service', true),
  ('nettoyage-matelas', 'Nettoyage de matelas', 'local_service', true),
  ('nettoyage-planchers', 'Nettoyage de planchers, céramique et coulis', 'local_service', true),
  ('lavage-pression', 'Lavage extérieur et à pression', 'local_service', true),
  ('nettoyage-gouttieres', 'Nettoyage de gouttières', 'local_service', true),
  ('ramonage-cheminee', 'Ramonage de cheminée', 'local_service', true),
  ('gestion-parasitaire', 'Gestion parasitaire / extermination', 'local_service', true),
  ('entretien-paysager', 'Entretien paysager', 'local_service', true),
  ('deneigement', 'Déneigement', 'local_service', true),
  ('entretien-piscine-spa', 'Entretien de piscine et spa', 'local_service', true),
  ('homme-a-tout-faire', 'Homme à tout faire / petits travaux', 'local_service', true),
  ('demenagement', 'Déménagement', 'local_service', true),
  ('organisation-rangement', 'Organisation et rangement', 'local_service', true),
  ('autre-service-residentiel', 'Autre service résidentiel', 'local_service', true)
ON CONFLICT (slug) DO UPDATE
  SET name_fr = EXCLUDED.name_fr,
      group_type = EXCLUDED.group_type,
      is_active = true,
      updated_at = now();

UPDATE public.founder_eligible_categories
SET name_fr = 'Nettoyage de conduits de ventilation', updated_at = now()
WHERE slug = 'nettoyage-conduits';

UPDATE public.founder_eligible_categories
SET name_fr = 'Installation et retrait d''abris temporaires', updated_at = now()
WHERE slug = 'abris-temporaires';