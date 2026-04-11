
-- =============================================
-- cities_quebec_clusters
-- =============================================
CREATE TABLE public.cities_quebec_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_name TEXT NOT NULL UNIQUE,
  cities_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  population_total INTEGER NOT NULL DEFAULT 0,
  gdp_estimate_millions NUMERIC,
  density_score NUMERIC NOT NULL DEFAULT 0,
  renovation_potential_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cities_quebec_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view clusters" ON public.cities_quebec_clusters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage clusters" ON public.cities_quebec_clusters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_cities_quebec_clusters_updated_at BEFORE UPDATE ON public.cities_quebec_clusters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- activities_primary
-- =============================================
CREATE TABLE public.activities_primary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'renovation',
  avg_job_value INTEGER NOT NULL DEFAULT 5000,
  urgency_level INTEGER NOT NULL DEFAULT 3,
  seasonality TEXT NOT NULL DEFAULT 'year_round',
  aeo_keywords_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activities_primary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view primary activities" ON public.activities_primary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage primary activities" ON public.activities_primary FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- activities_secondary
-- =============================================
CREATE TABLE public.activities_secondary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  linked_primary_names_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  cross_sell_score NUMERIC NOT NULL DEFAULT 5,
  aeo_keywords_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activities_secondary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view secondary activities" ON public.activities_secondary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage secondary activities" ON public.activities_secondary FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- contractor_generation_targets
-- =============================================
CREATE TABLE public.contractor_generation_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_cluster_id UUID NOT NULL REFERENCES public.cities_quebec_clusters(id) ON DELETE CASCADE,
  primary_activity_id UUID NOT NULL REFERENCES public.activities_primary(id) ON DELETE CASCADE,
  secondary_activity_id UUID REFERENCES public.activities_secondary(id) ON DELETE SET NULL,
  priority_score NUMERIC NOT NULL DEFAULT 0,
  estimated_contractors INTEGER NOT NULL DEFAULT 0,
  generated_count INTEGER NOT NULL DEFAULT 0,
  scraped_count INTEGER NOT NULL DEFAULT 0,
  enriched_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city_cluster_id, primary_activity_id, secondary_activity_id)
);

ALTER TABLE public.contractor_generation_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view targets" ON public.contractor_generation_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage targets" ON public.contractor_generation_targets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_contractor_generation_targets_updated_at BEFORE UPDATE ON public.contractor_generation_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_gen_targets_cluster ON public.contractor_generation_targets(city_cluster_id);
CREATE INDEX idx_gen_targets_priority ON public.contractor_generation_targets(priority_score DESC);

-- =============================================
-- scraping_generation_jobs
-- =============================================
CREATE TABLE public.scraping_generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL REFERENCES public.contractor_generation_targets(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'gmb',
  job_status TEXT NOT NULL DEFAULT 'pending',
  results_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scraping_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view scraping jobs" ON public.scraping_generation_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage scraping jobs" ON public.scraping_generation_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SEED: Quebec Clusters
-- =============================================
INSERT INTO public.cities_quebec_clusters (cluster_name, cities_json, population_total, gdp_estimate_millions, density_score, renovation_potential_score) VALUES
('Montréal', '["Montréal","Verdun","LaSalle","Lachine","Saint-Laurent","Outremont","Westmount","Mont-Royal","Côte-Saint-Luc","Hampstead"]', 1780000, 120000, 95, 92),
('Laval', '["Laval","Sainte-Dorothée","Chomedey","Duvernay","Fabreville","Vimont","Auteuil","Pont-Viau"]', 440000, 18000, 78, 85),
('Rive-Nord', '["Terrebonne","Repentigny","Mascouche","Saint-Jérôme","Blainville","Boisbriand","Rosemère","Mirabel","Sainte-Thérèse","Deux-Montagnes"]', 650000, 22000, 65, 88),
('Rive-Sud', '["Longueuil","Brossard","Saint-Hubert","Boucherville","Saint-Bruno","La Prairie","Chambly","Candiac","Châteauguay","Saint-Jean-sur-Richelieu"]', 720000, 25000, 70, 86),
('Québec', '["Québec","Lévis","Beauport","Charlesbourg","Sainte-Foy","Cap-Rouge","Saint-Augustin","L''Ancienne-Lorette"]', 580000, 35000, 72, 80),
('Outaouais', '["Gatineau","Hull","Aylmer","Buckingham","Masson-Angers","Chelsea","Cantley"]', 340000, 14000, 55, 72),
('Estrie', '["Sherbrooke","Magog","Granby","Drummondville","Victoriaville","Cowansville"]', 330000, 12000, 48, 70),
('Mauricie', '["Trois-Rivières","Shawinigan","Bécancour","Louiseville","La Tuque"]', 270000, 9000, 40, 65),
('Saguenay', '["Saguenay","Chicoutimi","Jonquière","Alma","Roberval","Dolbeau-Mistassini"]', 280000, 10000, 38, 62),
('Abitibi', '["Rouyn-Noranda","Val-d''Or","Amos","La Sarre","Malartic"]', 150000, 8000, 25, 55);

-- =============================================
-- SEED: Primary Activities
-- =============================================
INSERT INTO public.activities_primary (name, category, avg_job_value, urgency_level, seasonality, aeo_keywords_json) VALUES
('Isolation entretoit', 'isolation', 4500, 4, 'fall_winter', '["isolation grenier","isolation entretoit prix","isoler combles"]'),
('Toiture', 'toiture', 12000, 5, 'spring_fall', '["couvreur","réparation toiture","bardeaux"]'),
('Plomberie', 'plomberie', 3500, 5, 'year_round', '["plombier urgence","réparation fuite","débouchage"]'),
('Électricité', 'electricite', 4000, 4, 'year_round', '["électricien","panneau électrique","mise aux normes"]'),
('Thermopompe / HVAC', 'climatisation', 8000, 4, 'spring_summer', '["thermopompe","climatisation centrale","chauffage"]'),
('Rénovation cuisine', 'renovation', 25000, 2, 'year_round', '["rénovation cuisine prix","armoires cuisine","comptoir quartz"]'),
('Salle de bain', 'renovation', 15000, 3, 'year_round', '["rénovation salle de bain","douche céramique","vanité"]'),
('Excavation', 'excavation', 8000, 3, 'spring_fall', '["excavation résidentielle","terrassement","nivellement"]'),
('Drain français', 'fondation', 12000, 5, 'spring_fall', '["drain français prix","imperméabilisation fondation","fissure fondation"]'),
('Décontamination moisissure', 'decontamination', 6000, 5, 'year_round', '["moisissure maison","décontamination","test qualité air"]'),
('Désamiantage (vermiculite)', 'decontamination', 8000, 4, 'year_round', '["vermiculite amiante","désamiantage prix","test amiante"]'),
('Portes et fenêtres', 'fenetres', 10000, 3, 'spring_fall', '["remplacement fenêtres","porte patio","fenêtres écoénergétiques"]'),
('Revêtement extérieur', 'revetement', 15000, 2, 'spring_summer', '["revêtement maison","canexel","vinyle extérieur"]');

-- =============================================
-- SEED: Secondary Activities
-- =============================================
INSERT INTO public.activities_secondary (name, linked_primary_names_json, cross_sell_score, aeo_keywords_json) VALUES
('Inspection bâtiment', '["Toiture","Drain français","Décontamination moisissure"]', 9, '["inspection préachat","inspecteur bâtiment"]'),
('Évaluateur immobilier', '["Rénovation cuisine","Salle de bain"]', 7, '["évaluation maison","valeur marchande"]'),
('Courtier immobilier', '["Rénovation cuisine","Salle de bain","Portes et fenêtres"]', 8, '["vendre maison","agent immobilier"]'),
('Notaire', '["Rénovation cuisine","Excavation"]', 5, '["notaire immobilier","acte de vente"]'),
('Assurances habitation', '["Décontamination moisissure","Plomberie","Toiture"]', 8, '["assurance maison","réclamation dégât eau"]'),
('Nettoyage après sinistre', '["Plomberie","Décontamination moisissure"]', 9, '["nettoyage sinistre","dégât eau","après incendie"]'),
('Déneigement', '["Toiture","Excavation"]', 6, '["déneigement résidentiel","déblaiement toiture"]'),
('Tonte de pelouse', '["Excavation","Revêtement extérieur"]', 4, '["tonte pelouse","entretien gazon"]'),
('Ouverture/fermeture piscine', '["Excavation","Électricité"]', 5, '["ouverture piscine","fermeture piscine","entretien piscine"]'),
('Paysagement', '["Excavation","Revêtement extérieur"]', 7, '["paysagiste","aménagement paysager","terrassement"]'),
('Peinture', '["Rénovation cuisine","Salle de bain","Revêtement extérieur"]', 7, '["peintre résidentiel","peinture intérieure","peinture extérieure"]'),
('Design intérieur', '["Rénovation cuisine","Salle de bain"]', 6, '["designer intérieur","décoration maison"]'),
('Architecte', '["Rénovation cuisine","Salle de bain","Excavation"]', 6, '["architecte résidentiel","plans rénovation"]'),
('Gestion de condo', '["Plomberie","Électricité","Toiture"]', 7, '["syndicat copropriété","gestionnaire condo"]');
