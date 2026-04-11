
-- Add new columns to activities_secondary
ALTER TABLE public.activities_secondary
  ADD COLUMN IF NOT EXISTS frequency_score integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS seasonality_peak text DEFAULT 'year_round',
  ADD COLUMN IF NOT EXISTS avg_ticket_value integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_frequency text DEFAULT 'faible',
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS urgency_level integer DEFAULT 3;

-- Insert new everyday services
INSERT INTO public.activities_secondary (name, category, frequency_score, seasonality_peak, avg_ticket_value, repeat_frequency, urgency_level, cross_sell_score, linked_primary_names_json, aeo_keywords_json, status)
VALUES
-- EXTÉRIEUR / SAISONNIER
('Entretien piscine', 'exterieur_saisonnier', 9, 'ete', 300, 'annuelle', 3, 7, '["Excavation","Aménagement extérieur"]', '["entretien piscine","nettoyage piscine"]', 'active'),
('Ouverture piscine', 'exterieur_saisonnier', 8, 'printemps', 250, 'annuelle', 4, 6, '["Excavation","Aménagement extérieur"]', '["ouverture piscine","mise en marche piscine"]', 'active'),
('Fermeture piscine', 'exterieur_saisonnier', 8, 'automne', 250, 'annuelle', 4, 6, '["Excavation","Aménagement extérieur"]', '["fermeture piscine","hivernisation piscine"]', 'active'),
('Réparation piscine', 'exterieur_saisonnier', 5, 'ete', 800, 'occasionnel', 5, 7, '["Excavation","Plomberie"]', '["réparation piscine","fuite piscine"]', 'active'),
('Installation piscine hors-terre', 'exterieur_saisonnier', 3, 'printemps', 5000, 'tres_faible', 2, 8, '["Excavation","Aménagement extérieur"]', '["piscine hors terre","installation piscine"]', 'active'),
('Installation piscine creusée', 'exterieur_saisonnier', 2, 'printemps', 35000, 'tres_faible', 2, 9, '["Excavation","Aménagement extérieur"]', '["piscine creusée","construction piscine"]', 'active'),
('Entretien spa', 'exterieur_saisonnier', 7, 'year_round', 200, 'annuelle', 3, 5, '["Plomberie","Électricité"]', '["entretien spa","réparation spa"]', 'active'),

-- DÉMÉNAGEMENT
('Déménagement résidentiel', 'demenagement', 7, 'ete', 1500, 'faible', 4, 8, '["Courtier immobilier","Notaire"]', '["déménagement résidentiel","déménageur"]', 'active'),
('Déménagement commercial', 'demenagement', 4, 'year_round', 3000, 'faible', 3, 6, '["Courtier immobilier"]', '["déménagement commercial","déménageur entreprise"]', 'active'),
('Déménagement longue distance', 'demenagement', 3, 'ete', 4000, 'tres_faible', 3, 5, '["Courtier immobilier"]', '["déménagement longue distance","transport meubles"]', 'active'),
('Emballage et déballage', 'demenagement', 6, 'ete', 500, 'faible', 2, 7, '["Courtier immobilier","Notaire"]', '["emballage déménagement","service emballage"]', 'active'),
('Entreposage temporaire', 'demenagement', 5, 'year_round', 200, 'mensuelle', 2, 5, '["Courtier immobilier"]', '["entreposage","mini-entrepôt"]', 'active'),

-- ENTRETIEN EXTÉRIEUR
('Lavage de vitres', 'entretien_exterieur', 9, 'printemps', 250, 'annuelle', 2, 6, '["Rénovation cuisine","Portes et fenêtres"]', '["lavage vitres","nettoyage vitres"]', 'active'),
('Lavage pression', 'entretien_exterieur', 8, 'printemps', 300, 'annuelle', 2, 7, '["Revêtement extérieur","Aménagement extérieur"]', '["lavage pression","pressure washing"]', 'active'),
('Nettoyage gouttières', 'entretien_exterieur', 8, 'automne', 200, 'annuelle', 4, 7, '["Toiture"]', '["nettoyage gouttières","entretien gouttières"]', 'active'),
('Nettoyage toiture', 'entretien_exterieur', 6, 'printemps', 400, '2-3 ans', 3, 8, '["Toiture"]', '["nettoyage toiture","mousse toiture"]', 'active'),
('Scellant asphalte', 'entretien_exterieur', 6, 'printemps', 500, '2-3 ans', 3, 6, '["Excavation"]', '["scellant asphalte","scellant entrée"]', 'active'),
('Réparation asphalte', 'entretien_exterieur', 5, 'printemps', 700, 'occasionnel', 4, 6, '["Excavation"]', '["réparation asphalte","asphalte fissuré"]', 'active'),

-- INSTALLATIONS SIMPLES (ULTRA VIRAL LOCAL)
('Installation poteaux corde à linge', 'installations_simples', 5, 'printemps', 300, 'tres_faible', 2, 4, '["Excavation"]', '["corde à linge","poteau corde à linge"]', 'active'),
('Installation abri tempo', 'installations_simples', 7, 'automne', 400, 'annuelle', 3, 5, '["Aménagement extérieur"]', '["abri tempo","installation abri auto"]', 'active'),
('Montage/remisage cabanon', 'installations_simples', 5, 'printemps', 600, 'tres_faible', 2, 5, '["Aménagement extérieur"]', '["cabanon","montage cabanon"]', 'active'),
('Installation clôture légère', 'installations_simples', 6, 'printemps', 800, 'tres_faible', 2, 6, '["Aménagement extérieur"]', '["clôture","installation clôture"]', 'active'),
('Installation support TV', 'installations_simples', 8, 'year_round', 150, 'faible', 2, 3, '["Électricité"]', '["support TV","installation TV murale"]', 'active'),
('Installation électroménagers', 'installations_simples', 7, 'year_round', 200, 'faible', 3, 5, '["Plomberie","Électricité"]', '["installation électroménagers","branchement laveuse"]', 'active'),

-- ENTRETIEN GÉNÉRAL
('Ménage résidentiel', 'entretien_general', 10, 'year_round', 150, 'hebdomadaire', 2, 4, '["Rénovation cuisine","Salle de bain"]', '["ménage résidentiel","femme de ménage"]', 'active'),
('Grand ménage saisonnier', 'entretien_general', 8, 'printemps', 350, 'annuelle', 2, 5, '["Rénovation cuisine","Salle de bain"]', '["grand ménage","ménage printemps"]', 'active'),
('Désinfection', 'entretien_general', 6, 'year_round', 400, 'occasionnel', 5, 6, '["Décontamination moisissure","Nettoyage après sinistre"]', '["désinfection","décontamination"]', 'active'),
('Nettoyage après rénovation', 'entretien_general', 7, 'year_round', 500, 'occasionnel', 3, 8, '["Rénovation cuisine","Salle de bain","Portes et fenêtres"]', '["nettoyage après réno","ménage post-rénovation"]', 'active')
ON CONFLICT DO NOTHING;
