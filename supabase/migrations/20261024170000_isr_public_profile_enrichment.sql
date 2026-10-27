-- ISR / UNPRO -- REVIEW-ONLY MIGRATION; do not merge or run in production until QA passes.
-- Source: https://isroyal.ca/info ; https://isroyal.ca/about/isolation-solution-royal
-- Historical Google review counts differ across sources; deliberately no rating/review_count edits.
-- RBQ 5834-9101-01 is DECLARED on official website, NOT VERIFIED in current RBQ registry.
-- Owner's Oct 2026 clarification: West Island, Montreal-Est and Pointe-aux-Trembles accepted;
-- the remaining Montreal territory is not accepted by default. Never block all Montreal.
-- No pricing, payment, activation, verification badges, or appointment settings changed.

BEGIN;

DO $guard$
BEGIN
  IF (SELECT count(*) FROM public.contractors
      WHERE id = '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid AND slug = 'isolation-solution-royal') <> 1
  THEN RAISE EXCEPTION 'ISR target identity changed; abort enrichment'; END IF;
END $guard$;

UPDATE public.contractors SET
  legal_name = '9480-0976 Québec inc.',
  city = 'Terrebonne',
  address = '680 Chemin St Roch',
  postal_code = 'J6Y 1E1',
  neq = '1178224227',
  rbq_number = '5834-9101-01',
  license_number = '5834-9101-01',
  rbq_compliance_status = 'in_progress',
  logo_url = 'https://isroyal.ca/logo.png',
  google_business_url = 'https://www.google.com/maps/search/?api=1&query=Isolation%20Solution%20Royal%2C%20680%20Chemin%20St%20Roch%2C%20Terrebonne%2C%20QC%20J6Y%201E1&query_place_id=ChIJVVUZCzLYyEwRcYEVM2uLpA8',
  specialty = 'Isolation et ventilation d''entretoit',
  description = 'Isolation Solution Royal, exploitée par 9480-0976 Québec inc., est spécialisée en isolation d''entretoit résidentiel, ventilation, étanchéité à l''air, décontamination de moisissures et vermiculite. Fibre de verre soufflée R-51 à R-60. Inspection sur place, estimation sans pression et garantie annoncée de 25 ans selon les conditions applicables.',
  services_structured = ARRAY['Isolation d''entretoit R-51 à R-60', 'Mise à niveau d''isolation d''entretoit', 'Étanchéité à l''air d''entretoit', 'Calfeutrage et trappe d''accès', 'Ventilation d''entretoit', 'Déblocage de soffites', 'Décontamination de moisissures', 'Vermiculite : inspection et décontamination', 'Inspection et diagnostic d''entretoit', 'Correction de condensation dans l''entretoit', 'Prévention des barrages de glace'],
  service_areas = ARRAY['Laval', 'Saint-Eustache', 'Repentigny', 'Joliette', 'Rosemère', 'Boisbriand', 'Blainville', 'Mirabel', 'Saint-Jérôme', 'Sainte-Thérèse', 'Terrebonne', 'Mascouche', 'Baie-D''Urfé', 'Beaconsfield', 'Dollard-des-Ormeaux', 'Dorval', 'Kirkland', 'Pointe-Claire', 'Sainte-Anne-de-Bellevue', 'Senneville', 'Pierrefonds', 'Roxboro', 'Pierrefonds-Roxboro', 'L''Île-Bizard', 'Sainte-Geneviève', 'L''Île-Bizard–Sainte-Geneviève', 'Montréal-Est', 'Pointe-aux-Trembles'],
  updated_at = now()
WHERE id = '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid AND slug = 'isolation-solution-royal';

-- Montreal generic is NOT a supported area. Exact approved localities remain serviceable.
-- Montreal-Est is an independent municipality; Pointe-aux-Trembles is part of
-- Montreal. West Island municipalities/boroughs need locality-level evidence.
-- If the lead only says "Montreal", do NOT infer an allowed borough.
DELETE FROM public.contractor_service_areas
WHERE contractor_id = '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid
  AND city_slug = 'montreal';

-- Prevent old blanket-Montreal hard exclusions from hiding legitimate West Island,
-- Montreal-Est, and Pointe-aux-Trembles opportunities.
UPDATE public.contractor_matching_rules
SET is_active = false, updated_at = now()
WHERE contractor_id = '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid
  AND rule_key = 'territory:montreal'
  AND rule_type = 'hard_exclusion';

-- Add the explicit permitted subregions; do not mark them RBQ-verified.
-- The standard match gate requires an exact locality. For a postal address that
-- resolves only to Montreal, Clara must ask for the district before matching.
WITH authorized(city_name,city_slug) AS (
  VALUES
  ('Baie-D''Urfé','baie-d-urfe'),
  ('Beaconsfield','beaconsfield'),
  ('Dollard-des-Ormeaux','dollard-des-ormeaux'),
  ('Dorval','dorval'),
  ('Kirkland','kirkland'),
  ('Pointe-Claire','pointe-claire'),
  ('Sainte-Anne-de-Bellevue','sainte-anne-de-bellevue'),
  ('Senneville','senneville'),
  ('Pierrefonds','pierrefonds'),
  ('Roxboro','roxboro'),
  ('Pierrefonds-Roxboro','pierrefonds-roxboro'),
  ('L''Île-Bizard','l-ile-bizard'),
  ('Sainte-Geneviève','sainte-genevieve'),
  ('L''Île-Bizard–Sainte-Geneviève','l-ile-bizard-sainte-genevieve'),
  ('Montréal-Est','montreal-est'),
  ('Pointe-aux-Trembles','pointe-aux-trembles')
)
INSERT INTO public.contractor_service_areas
  (contractor_id,city_name,city_slug,province,data_source,validation_status)
SELECT '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid, a.city_name, a.city_slug, 'QC',
       'founder_instruction', 'pending'
FROM authorized a
WHERE NOT EXISTS (
  SELECT 1 FROM public.contractor_service_areas s
  WHERE s.contractor_id = '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid
    AND (s.city_slug = a.city_slug OR lower(s.city_name) = lower(a.city_name))
);

WITH proposed(service_name_fr,description_fr,is_primary,display_order) AS (
  VALUES
  ('Isolation d''entretoit R-51 à R-60','Isolation résidentielle avec fibre de verre soufflée.',true,1),
  ('Mise à niveau d''isolation d''entretoit','Ajout ou correction de l''isolant après inspection.',false,2),
  ('Étanchéité à l''air d''entretoit','Correction des fuites d''air et des passages d''air.',false,3),
  ('Calfeutrage et trappe d''accès','Scellement des trappes et des pénétrations dans l''entretoit.',false,4),
  ('Ventilation d''entretoit','Ventilation et déflecteurs pour les entrées d''air.',false,5),
  ('Déblocage de soffites','Dégagement des entrées d''air obstruées.',false,6),
  ('Décontamination de moisissures','Inspection et traitement des moisissures en entretoit.',false,7),
  ('Vermiculite : inspection et décontamination','Évaluation des matériaux et intervention selon les obligations applicables.',false,8),
  ('Inspection et diagnostic d''entretoit','Évaluation sur place de l''isolation, de l''humidité et de la ventilation.',false,9),
  ('Correction de condensation dans l''entretoit','Évaluation et correction des causes de condensation.',false,10),
  ('Prévention des barrages de glace','Correction des causes liées à l''isolation, à l''étanchéité et à la ventilation.',false,11)
)
INSERT INTO public.contractor_services
  (contractor_id, service_name_fr, description_fr, is_primary, display_order, data_source, is_active)
SELECT '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid, p.service_name_fr, p.description_fr, p.is_primary, p.display_order, 'public_source', true
FROM proposed p
WHERE NOT EXISTS (
  SELECT 1 FROM public.contractor_services s
  WHERE s.contractor_id = '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid
    AND lower(s.service_name_fr) = lower(p.service_name_fr)
);

INSERT INTO public.contractor_profile_facts
  (contractor_id, field_key, field_value, provenance, source_url)
VALUES
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','address','"680 Chemin St Roch, Terrebonne, QC J6Y 1E1"'::jsonb,'public_source','https://isroyal.ca/info'),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','neq','"1178224227"'::jsonb,'public_source','https://isroyal.ca/info'),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','rbq','"5834-9101-01 (numéro publié par ISR; statut officiel non encore vérifié)"'::jsonb,'public_source','https://isroyal.ca/info'),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','logo_url','"https://isroyal.ca/logo.png"'::jsonb,'public_source','https://isroyal.ca/'),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','google_business_url','"https://www.google.com/maps/search/?api=1&query=Isolation%20Solution%20Royal%2C%20680%20Chemin%20St%20Roch%2C%20Terrebonne%2C%20QC%20J6Y%201E1&query_place_id=ChIJVVUZCzLYyEwRcYEVM2uLpA8"'::jsonb,'public_source','https://github.com/Ndeavr/bilingual-insulation-haven/blob/main/src/config/businessData.ts'),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','services_public','["Isolation d''entretoit R-51 à R-60","Mise à niveau d''isolation d''entretoit","Étanchéité à l''air d''entretoit","Calfeutrage et trappe d''accès","Ventilation d''entretoit","Déblocage de soffites","Décontamination de moisissures","Vermiculite : inspection et décontamination","Inspection et diagnostic d''entretoit","Correction de condensation dans l''entretoit","Prévention des barrages de glace"]'::jsonb,'public_source','https://isroyal.ca/about/isolation-solution-royal'),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','services_non_offerts','["Isolation des murs, planchers ou sous-sols","Toits plats ou cathédrales","Uréthane giclé","Cellulose soufflée","Commercial/industriel"]'::jsonb,'public_source','https://isroyal.ca/about/isolation-solution-royal'),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','services_a_confirmer','[]'::jsonb,'public_source','https://isroyal.ca/about/isolation-solution-royal'),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','territories_public','["Laval","Saint-Eustache","Repentigny","Joliette","Rosemère","Boisbriand","Blainville","Mirabel","Saint-Jérôme","Sainte-Thérèse","Terrebonne","Mascouche","Baie-D''Urfé","Beaconsfield","Dollard-des-Ormeaux","Dorval","Kirkland","Pointe-Claire","Sainte-Anne-de-Bellevue","Senneville","Pierrefonds","Roxboro","Pierrefonds-Roxboro","L''Île-Bizard","Sainte-Geneviève","L''Île-Bizard–Sainte-Geneviève","Montréal-Est","Pointe-aux-Trembles"]'::jsonb,'confirmed_by_company',NULL),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','territories_excluded_for_matching','["Montréal sans secteur précis : validation de quartier obligatoire","Centre-ville / Ville-Marie : exclu","Autres secteurs de Montréal hors West Island, Montréal-Est et Pointe-aux-Trembles : exclus","Rive-Sud : exclue"]'::jsonb,'confirmed_by_company',NULL),
  ('0abadcb7-3524-4db0-92ff-a73db8a443be','reviews_sync_status','"Source Google reliée par URL; aucune note ni nombre d''avis importés sans vérification indépendante"'::jsonb,'public_source',NULL)
ON CONFLICT (contractor_id,field_key) DO UPDATE SET
  field_value = EXCLUDED.field_value,
  provenance = 'public_source',
  source_url = EXCLUDED.source_url,
  updated_at = now();

INSERT INTO public.contractor_review_sources
  (contractor_id, source_name, profile_url, sync_status)
SELECT '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid,'Google Maps','https://www.google.com/maps/search/?api=1&query=Isolation%20Solution%20Royal%2C%20680%20Chemin%20St%20Roch%2C%20Terrebonne%2C%20QC%20J6Y%201E1&query_place_id=ChIJVVUZCzLYyEwRcYEVM2uLpA8','pending'
WHERE NOT EXISTS (
  SELECT 1 FROM public.contractor_review_sources
  WHERE contractor_id = '0abadcb7-3524-4db0-92ff-a73db8a443be'::uuid AND lower(source_name) LIKE '%google%'
);

-- Before promoting to production, validate same-card public RPC and city exclusions,
-- RBQ labels, Google external URL, network response for logo, and mobile layout.
COMMIT;
