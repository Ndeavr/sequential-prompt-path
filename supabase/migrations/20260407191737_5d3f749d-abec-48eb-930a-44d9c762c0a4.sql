-- Add Stripe price ID columns and richer plan data
ALTER TABLE plan_catalog
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_yearly_price_id text,
  ADD COLUMN IF NOT EXISTS features_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS appointments_included integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS appointments_range_min integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS appointments_range_max integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_sizes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS appointment_notes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS highlighted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS matching_boost numeric DEFAULT 0;

-- Update Recrue
UPDATE plan_catalog SET
  monthly_price = 14900,
  annual_price = 149900,
  stripe_monthly_price_id = 'price_1TJf6SCvZwK1QnPVI8AXBIdD',
  stripe_yearly_price_id = 'price_1TJZb2CvZwK1QnPVCqnR2OM7',
  features_json = '["Profil public de base","Score AIPP visible","3 rendez-vous inclus / mois","Accès aux projets XS et S","Support Alex"]'::jsonb,
  appointments_included = 3,
  appointments_range_min = 3,
  appointments_range_max = 8,
  project_sizes = '["XS","S"]'::jsonb,
  appointment_notes = '["3 rendez-vous inclus / mois","Achat de rendez-vous supplémentaires à la carte","Projets accessibles : XS, S"]'::jsonb,
  tagline = 'Pour commencer sur UNPRO et recevoir vos premiers rendez-vous.',
  highlighted = false,
  priority_level = 1,
  matching_boost = 0
WHERE code = 'recrue';

-- Update Pro
UPDATE plan_catalog SET
  monthly_price = 34900,
  annual_price = 349900,
  stripe_monthly_price_id = 'price_1TJf6lCvZwK1QnPV40NvbcaQ',
  stripe_yearly_price_id = 'price_1TJZb2CvZwK1QnPVI0hGFF39',
  features_json = '["Profil public complet","5 à 12 rendez-vous / mois","Visibilité améliorée dans la recherche","Badge Pro","Support Alex prioritaire","Accès aux projets XS à M"]'::jsonb,
  appointments_included = 5,
  appointments_range_min = 5,
  appointments_range_max = 12,
  project_sizes = '["XS","S","M"]'::jsonb,
  appointment_notes = '["5 rendez-vous inclus / mois","Achat de rendez-vous supplémentaires à la carte","Projets accessibles : XS, S, M"]'::jsonb,
  tagline = 'Pour établir une présence solide et recevoir des opportunités ciblées.',
  highlighted = true,
  priority_level = 2,
  matching_boost = 0.1
WHERE code = 'pro';

-- Update Premium
UPDATE plan_catalog SET
  monthly_price = 59900,
  annual_price = 599900,
  stripe_monthly_price_id = 'price_1TJf6mCvZwK1QnPV9GWx7OEM',
  stripe_yearly_price_id = 'price_1TJZb3CvZwK1QnPVhn0vbYhM',
  features_json = '["Tout le plan Pro","10 à 25 rendez-vous / mois","Auto-acceptation des projets","Demandes d''avis automatiques","Statistiques avancées","Badge Premium","Accès aux projets XS à L"]'::jsonb,
  appointments_included = 10,
  appointments_range_min = 10,
  appointments_range_max = 25,
  project_sizes = '["XS","S","M","L"]'::jsonb,
  appointment_notes = '["10 rendez-vous inclus / mois","Achat de rendez-vous supplémentaires à la carte","Projets accessibles : XS, S, M, L"]'::jsonb,
  tagline = 'Pour accélérer avec plus d''automatisation et plus de potentiel.',
  highlighted = false,
  priority_level = 3,
  matching_boost = 0.2
WHERE code = 'premium';

-- Update Élite
UPDATE plan_catalog SET
  monthly_price = 99900,
  annual_price = 999900,
  stripe_monthly_price_id = 'price_1TJf6oCvZwK1QnPVX1kQNexL',
  stripe_yearly_price_id = 'price_1TJZb3CvZwK1QnPVe52XCyib',
  features_json = '["Tout le plan Premium","25 à 60 rendez-vous / mois","Support dédié","Analytics avancés","Priorité renforcée dans les recommandations","Accès aux projets XS à XL"]'::jsonb,
  appointments_included = 25,
  appointments_range_min = 25,
  appointments_range_max = 60,
  project_sizes = '["XS","S","M","L","XL"]'::jsonb,
  appointment_notes = '["25 rendez-vous inclus / mois","Achat de rendez-vous supplémentaires à la carte","Projets accessibles : XS à XL"]'::jsonb,
  tagline = 'Pour maximiser la capacité, la rapidité et la domination locale.',
  highlighted = false,
  priority_level = 4,
  matching_boost = 0.35
WHERE code = 'elite';

-- Update Signature
UPDATE plan_catalog SET
  monthly_price = 179900,
  annual_price = 1799900,
  stripe_monthly_price_id = 'price_1TJf6pCvZwK1QnPV89OqHFPZ',
  stripe_yearly_price_id = 'price_1TJZb4CvZwK1QnPVtcHaVEhr',
  features_json = '["Visibilité maximale","50 à 120 rendez-vous / mois","Badge Signature","Priorité maximale dans les recommandations","Auto-acceptation intelligente","Rapports personnalisés","Potentiel d''exclusivité territoriale","Accès à tous les projets XS à XXL"]'::jsonb,
  appointments_included = 50,
  appointments_range_min = 50,
  appointments_range_max = 120,
  project_sizes = '["XS","S","M","L","XL","XXL"]'::jsonb,
  appointment_notes = '["50 rendez-vous inclus / mois","Achat de rendez-vous supplémentaires à la carte","Potentiel d''exclusivité sur certaines combinaisons spécialité + localité"]'::jsonb,
  tagline = 'Pour les entreprises qui veulent verrouiller leur position dans leur marché.',
  highlighted = false,
  priority_level = 5,
  matching_boost = 0.5
WHERE code = 'signature';

-- RLS: Allow anyone to read active plans (public pricing page)
CREATE POLICY "Anyone can view active plans"
  ON plan_catalog FOR SELECT
  USING (active = true);