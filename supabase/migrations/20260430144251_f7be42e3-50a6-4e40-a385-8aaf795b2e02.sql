
-- LEAD PIPE EMPIRE — Schema

-- 1. City risk profiles
CREATE TABLE public.lead_pipe_city_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  city_slug text NOT NULL UNIQUE,
  region text,
  population int,
  risk_index int NOT NULL DEFAULT 50,
  avg_build_year int,
  old_zone_count int DEFAULT 0,
  pre_1950_share numeric DEFAULT 0,
  pre_1975_share numeric DEFAULT 0,
  public_lead_service_estimated boolean DEFAULT false,
  source_notes text,
  hero_summary text,
  faq jsonb DEFAULT '[]'::jsonb,
  recommended_actions jsonb DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lpcp_active ON public.lead_pipe_city_profiles(active);
CREATE INDEX idx_lpcp_risk ON public.lead_pipe_city_profiles(risk_index DESC);

-- 2. Neighborhood (quartier) profiles
CREATE TABLE public.lead_pipe_neighborhood_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  neighborhood text NOT NULL,
  neighborhood_slug text NOT NULL,
  risk_index int NOT NULL DEFAULT 50,
  avg_build_year int,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city_slug, neighborhood_slug)
);
CREATE INDEX idx_lpnp_city ON public.lead_pipe_neighborhood_profiles(city_slug);

-- 3. Per-property risk scores
CREATE TABLE public.property_lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  city text,
  city_slug text,
  neighborhood text,
  year_built int,
  property_type text,
  score int NOT NULL,
  risk_level text NOT NULL,
  factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pls_property ON public.property_lead_scores(property_id);
CREATE INDEX idx_pls_user ON public.property_lead_scores(user_id);

-- 4. Page analytics
CREATE TABLE public.lead_pipe_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  slug text NOT NULL,
  path text NOT NULL,
  session_id text,
  user_id uuid,
  event text NOT NULL DEFAULT 'view',
  utm jsonb DEFAULT '{}'::jsonb,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lppv_city ON public.lead_pipe_page_views(city_slug);
CREATE INDEX idx_lppv_event ON public.lead_pipe_page_views(event);
CREATE INDEX idx_lppv_created ON public.lead_pipe_page_views(created_at DESC);

-- 5. Plumber lead requests
CREATE TABLE public.plumber_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  property_lead_score_id uuid REFERENCES public.property_lead_scores(id) ON DELETE SET NULL,
  city text,
  city_slug text,
  category text NOT NULL DEFAULT 'lead_pipe_inspection',
  urgency text NOT NULL DEFAULT 'normal',
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'lead_pipe_empire',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pl_status ON public.plumber_leads(status);
CREATE INDEX idx_pl_user ON public.plumber_leads(user_id);

-- 6. Affiliate clicks
CREATE TABLE public.lead_pipe_affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key text NOT NULL,
  city_slug text,
  user_id uuid,
  session_id text,
  destination_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lpac_product ON public.lead_pipe_affiliate_clicks(product_key);

-- Triggers
CREATE TRIGGER trg_lpcp_updated BEFORE UPDATE ON public.lead_pipe_city_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lpnp_updated BEFORE UPDATE ON public.lead_pipe_neighborhood_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pl_updated BEFORE UPDATE ON public.plumber_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.lead_pipe_city_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipe_neighborhood_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipe_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plumber_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipe_affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- City/neighborhood profiles: public read, admin write
CREATE POLICY "lpcp public read" ON public.lead_pipe_city_profiles
  FOR SELECT USING (active = true);
CREATE POLICY "lpcp admin all" ON public.lead_pipe_city_profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "lpnp public read" ON public.lead_pipe_neighborhood_profiles
  FOR SELECT USING (active = true);
CREATE POLICY "lpnp admin all" ON public.lead_pipe_neighborhood_profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Property lead scores: owner read/insert, admin all
CREATE POLICY "pls owner read" ON public.property_lead_scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pls owner insert" ON public.property_lead_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pls admin all" ON public.property_lead_scores
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Page views: anyone can insert (anon analytics), admin read
CREATE POLICY "lppv insert anyone" ON public.lead_pipe_page_views
  FOR INSERT WITH CHECK (true);
CREATE POLICY "lppv admin read" ON public.lead_pipe_page_views
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Plumber leads: anyone can insert, owner read, admin all
CREATE POLICY "pl insert anyone" ON public.plumber_leads
  FOR INSERT WITH CHECK (true);
CREATE POLICY "pl owner read" ON public.plumber_leads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pl admin all" ON public.plumber_leads
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Affiliate clicks: anyone insert, admin read
CREATE POLICY "lpac insert anyone" ON public.lead_pipe_affiliate_clicks
  FOR INSERT WITH CHECK (true);
CREATE POLICY "lpac admin read" ON public.lead_pipe_affiliate_clicks
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- SEED ~50 QC cities
INSERT INTO public.lead_pipe_city_profiles
  (city, city_slug, region, population, risk_index, avg_build_year, pre_1950_share, pre_1975_share, public_lead_service_estimated, hero_summary)
VALUES
  ('Montréal','montreal','Montréal',1780000,82,1955,0.22,0.58,true,'Plusieurs secteurs centraux datent d''avant 1970.'),
  ('Laval','laval','Laval',440000,58,1972,0.05,0.42,false,'Mix de secteurs anciens et nouveaux.'),
  ('Longueuil','longueuil','Montérégie',254000,62,1968,0.07,0.48,true,'Vieux-Longueuil concentre les bâtiments historiques.'),
  ('Québec','quebec','Capitale-Nationale',549000,75,1958,0.18,0.55,true,'Vieux-Québec et Limoilou très anciens.'),
  ('Gatineau','gatineau','Outaouais',291000,55,1975,0.06,0.40,false,'Hull historique présente plus de risque.'),
  ('Sherbrooke','sherbrooke','Estrie',172000,60,1968,0.09,0.46,false,'Centre-ville Sherbrooke ancien.'),
  ('Trois-Rivières','trois-rivieres','Mauricie',140000,63,1965,0.11,0.49,true,'Vieux quartiers industriels.'),
  ('Saguenay','saguenay','Saguenay–Lac-Saint-Jean',144000,52,1976,0.05,0.36,false,'Plus récent globalement.'),
  ('Lévis','levis','Chaudière-Appalaches',150000,50,1978,0.04,0.34,false,'Surtout secteurs récents.'),
  ('Terrebonne','terrebonne','Lanaudière',119000,48,1985,0.02,0.25,false,'Croissance récente.'),
  ('Saint-Jean-sur-Richelieu','saint-jean-sur-richelieu','Montérégie',98000,55,1972,0.06,0.42,false,NULL),
  ('Repentigny','repentigny','Lanaudière',86000,45,1983,0.02,0.28,false,NULL),
  ('Brossard','brossard','Montérégie',91000,42,1986,0.01,0.22,false,NULL),
  ('Drummondville','drummondville','Centre-du-Québec',79000,55,1972,0.07,0.40,false,NULL),
  ('Saint-Jérôme','saint-jerome','Laurentides',81000,57,1970,0.08,0.44,false,NULL),
  ('Granby','granby','Montérégie',69000,55,1970,0.07,0.43,false,NULL),
  ('Blainville','blainville','Laurentides',59000,40,1990,0.01,0.18,false,NULL),
  ('Saint-Hyacinthe','saint-hyacinthe','Montérégie',58000,58,1968,0.09,0.46,false,NULL),
  ('Shawinigan','shawinigan','Mauricie',49000,68,1960,0.15,0.55,true,NULL),
  ('Dollard-Des-Ormeaux','dollard-des-ormeaux','Montréal',49000,45,1980,0.02,0.30,false,NULL),
  ('Châteauguay','chateauguay','Montérégie',50000,50,1976,0.04,0.36,false,NULL),
  ('Rimouski','rimouski','Bas-Saint-Laurent',49000,52,1974,0.06,0.40,false,NULL),
  ('Saint-Eustache','saint-eustache','Laurentides',45000,50,1976,0.05,0.36,false,NULL),
  ('Mirabel','mirabel','Laurentides',56000,38,1995,0.01,0.15,false,NULL),
  ('Victoriaville','victoriaville','Centre-du-Québec',47000,55,1972,0.07,0.42,false,NULL),
  ('Salaberry-de-Valleyfield','salaberry-de-valleyfield','Montérégie',40000,60,1968,0.10,0.46,false,NULL),
  ('Sorel-Tracy','sorel-tracy','Montérégie',35000,62,1965,0.11,0.48,false,NULL),
  ('Boucherville','boucherville','Montérégie',42000,42,1985,0.02,0.25,false,NULL),
  ('Saint-Bruno-de-Montarville','saint-bruno-de-montarville','Montérégie',27000,40,1985,0.02,0.24,false,NULL),
  ('Mascouche','mascouche','Lanaudière',49000,42,1987,0.01,0.22,false,NULL),
  ('Joliette','joliette','Lanaudière',21000,58,1968,0.09,0.45,false,NULL),
  ('Sept-Îles','sept-iles','Côte-Nord',26000,50,1976,0.05,0.36,false,NULL),
  ('Val-d''Or','val-d-or','Abitibi-Témiscamingue',33000,52,1974,0.06,0.40,false,NULL),
  ('Rouyn-Noranda','rouyn-noranda','Abitibi-Témiscamingue',43000,53,1972,0.07,0.42,false,NULL),
  ('Alma','alma','Saguenay–Lac-Saint-Jean',31000,50,1976,0.05,0.36,false,NULL),
  ('Thetford Mines','thetford-mines','Chaudière-Appalaches',26000,60,1965,0.10,0.48,false,NULL),
  ('Magog','magog','Estrie',28000,52,1974,0.06,0.40,false,NULL),
  ('Saint-Georges','saint-georges','Chaudière-Appalaches',33000,50,1976,0.05,0.36,false,NULL),
  ('Sainte-Julie','sainte-julie','Montérégie',31000,40,1988,0.01,0.20,false,NULL),
  ('Vaudreuil-Dorion','vaudreuil-dorion','Montérégie',43000,42,1986,0.02,0.24,false,NULL),
  ('Chambly','chambly','Montérégie',31000,48,1980,0.04,0.30,false,NULL),
  ('Sainte-Thérèse','sainte-therese','Laurentides',27000,50,1976,0.05,0.36,false,NULL),
  ('Saint-Constant','saint-constant','Montérégie',29000,42,1987,0.02,0.24,false,NULL),
  ('Pointe-Claire','pointe-claire','Montréal',32000,55,1972,0.07,0.42,false,NULL),
  ('Kirkland','kirkland','Montréal',21000,40,1988,0.01,0.20,false,NULL),
  ('Beaconsfield','beaconsfield','Montréal',20000,48,1978,0.04,0.32,false,NULL),
  ('Saint-Lambert','saint-lambert','Montérégie',23000,58,1968,0.09,0.45,false,NULL),
  ('Côte-Saint-Luc','cote-saint-luc','Montréal',32000,52,1974,0.06,0.40,false,NULL),
  ('Mont-Royal','mont-royal','Montréal',20000,60,1965,0.12,0.50,false,NULL),
  ('Westmount','westmount','Montréal',20000,68,1955,0.20,0.60,true,NULL);

-- SEED Montréal/Longueuil neighborhoods
INSERT INTO public.lead_pipe_neighborhood_profiles (city_slug, neighborhood, neighborhood_slug, risk_index, avg_build_year, notes)
VALUES
  ('montreal','Plateau-Mont-Royal','plateau-mont-royal',88,1925,'Triplex et duplex centenaires.'),
  ('montreal','Rosemont','rosemont',78,1945,'Plex d''avant-guerre.'),
  ('montreal','Hochelaga','hochelaga',82,1935,'Quartier ouvrier ancien.'),
  ('montreal','NDG','ndg',72,1950,'Mixte ancien et rénové.'),
  ('montreal','Verdun','verdun',75,1948,'Plex à rénover.'),
  ('montreal','Villeray','villeray',80,1942,'Anciens triplex.'),
  ('montreal','Outremont','outremont',70,1955,'Maisons cossues anciennes.'),
  ('montreal','Mile End','mile-end',82,1930,'Centenaire industriel.'),
  ('longueuil','Vieux-Longueuil','vieux-longueuil',75,1955,'Cœur historique.'),
  ('quebec','Limoilou','limoilou',78,1940,'Plex anciens.'),
  ('quebec','Vieux-Québec','vieux-quebec',90,1900,'Bâtiments centenaires.'),
  ('gatineau','Hull','hull',72,1950,'Centre historique.');
