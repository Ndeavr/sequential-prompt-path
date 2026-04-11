
-- Autonomous prospection agent rules
CREATE TABLE public.prospection_agent_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'trade', -- 'trade' or 'homeowner_need'
  target_category TEXT NOT NULL,
  target_cities_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  radius_km INTEGER NOT NULL DEFAULT 25,
  priority INTEGER NOT NULL DEFAULT 3, -- 1=critical, 5=low
  frequency_hours INTEGER NOT NULL DEFAULT 24,
  max_concurrent_jobs INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ DEFAULT now(),
  total_leads_generated INTEGER NOT NULL DEFAULT 0,
  total_jobs_run INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_agent_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rules"
  ON public.prospection_agent_rules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage rules"
  ON public.prospection_agent_rules FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER update_prospection_agent_rules_updated_at
  BEFORE UPDATE ON public.prospection_agent_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial rules
INSERT INTO public.prospection_agent_rules (rule_name, rule_type, target_category, target_cities_json, keywords_json, priority, frequency_hours, notes) VALUES
  ('Rénovation résidentielle — Montréal', 'trade', 'Rénovation', '["Montréal","Laval","Longueuil","Brossard"]', '["rénovation cuisine","rénovation salle de bain","rénovation sous-sol"]', 1, 24, 'Haute demande constante — priorité maximale'),
  ('Paysagement — Rive-Sud', 'trade', 'Paysagement', '["Longueuil","Brossard","Saint-Hubert","Boucherville"]', '["paysagiste","aménagement paysager","terrassement"]', 2, 48, 'Saisonnier printemps-été — fréquence moyenne'),
  ('Toiture — Québec', 'trade', 'Toiture', '["Québec","Lévis","Beauport","Charlesbourg"]', '["couvreur","toiture bardeaux","réparation toiture"]', 2, 48, 'Demande post-hiver et automne'),
  ('Isolation acoustique entre étages', 'homeowner_need', 'Isolation', '["Montréal","Laval","Québec"]', '["isolation acoustique","insonorisation plancher","bruit entre étages","isolation phonique"]', 3, 72, 'Niche en croissance — condos et duplex'),
  ('Décontamination maison cannabis', 'homeowner_need', 'Décontamination', '["Montréal","Laval","Longueuil","Gatineau"]', '["décontamination cannabis","culture cannabis maison","nettoyage grow op","moisissure cannabis"]', 2, 48, 'Marché émergent post-légalisation — forte valeur'),
  ('Plomberie urgence', 'trade', 'Plomberie', '["Montréal","Laval","Longueuil"]', '["plombier urgence","dégât eau","débouchage drain"]', 1, 24, 'Demande constante — leads à haute conversion');
