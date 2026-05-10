
-- Journal: Authority content infrastructure

CREATE TABLE public.journal_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  order_index int NOT NULL DEFAULT 0,
  theme_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.journal_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  h1 text,
  dek text,
  body_md text NOT NULL DEFAULT '',
  body_html text,
  summary_short text,
  summary_long text,
  key_takeaways jsonb NOT NULL DEFAULT '[]'::jsonb,
  quotable_statements jsonb NOT NULL DEFAULT '[]'::jsonb,
  reading_time_minutes int,
  word_count int,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  tier text NOT NULL DEFAULT 'essay' CHECK (tier IN ('flagship','thesis','report','essay')),
  serie_id uuid REFERENCES public.journal_series(id) ON DELETE SET NULL,
  hero_image_url text,
  ai_optimized_score int,
  aeo_score int,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_articles_status ON public.journal_articles(status);
CREATE INDEX idx_journal_articles_published_at ON public.journal_articles(published_at DESC);
CREATE INDEX idx_journal_articles_serie ON public.journal_articles(serie_id);

CREATE TABLE public.journal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('concept','product','infrastructure','stakeholder','geography')),
  short_definition text,
  long_definition text,
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_entity_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.journal_article_entities (
  article_id uuid NOT NULL REFERENCES public.journal_articles(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.journal_entities(id) ON DELETE CASCADE,
  relevance_weight int NOT NULL DEFAULT 5,
  PRIMARY KEY (article_id, entity_id)
);

CREATE TABLE public.journal_article_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.journal_articles(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  order_index int NOT NULL DEFAULT 0
);
CREATE INDEX idx_journal_faqs_article ON public.journal_article_faqs(article_id, order_index);

CREATE TABLE public.journal_article_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.journal_articles(id) ON DELETE CASCADE,
  quote text NOT NULL,
  source text,
  source_url text,
  citation_type text NOT NULL DEFAULT 'source' CHECK (citation_type IN ('stat','quote','source')),
  order_index int NOT NULL DEFAULT 0
);
CREATE INDEX idx_journal_citations_article ON public.journal_article_citations(article_id);

CREATE TABLE public.journal_article_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.journal_articles(id) ON DELETE CASCADE,
  anchor_id text NOT NULL,
  heading text NOT NULL,
  level int NOT NULL DEFAULT 2,
  body_md text NOT NULL DEFAULT '',
  order_index int NOT NULL DEFAULT 0
);
CREATE INDEX idx_journal_sections_article ON public.journal_article_sections(article_id, order_index);

-- updated_at trigger
CREATE TRIGGER trg_journal_articles_updated BEFORE UPDATE ON public.journal_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_journal_series_updated BEFORE UPDATE ON public.journal_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_journal_entities_updated BEFORE UPDATE ON public.journal_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.journal_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_article_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_article_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_article_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_article_sections ENABLE ROW LEVEL SECURITY;

-- Public can read published articles + related rows
CREATE POLICY "Public reads published articles" ON public.journal_articles
  FOR SELECT USING (status = 'published');
CREATE POLICY "Public reads series" ON public.journal_series FOR SELECT USING (true);
CREATE POLICY "Public reads entities" ON public.journal_entities FOR SELECT USING (true);
CREATE POLICY "Public reads article entities" ON public.journal_article_entities
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.journal_articles a WHERE a.id = article_id AND a.status = 'published'));
CREATE POLICY "Public reads faqs" ON public.journal_article_faqs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.journal_articles a WHERE a.id = article_id AND a.status = 'published'));
CREATE POLICY "Public reads citations" ON public.journal_article_citations
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.journal_articles a WHERE a.id = article_id AND a.status = 'published'));
CREATE POLICY "Public reads sections" ON public.journal_article_sections
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.journal_articles a WHERE a.id = article_id AND a.status = 'published'));

-- Admin write policies (uses existing has_role)
CREATE POLICY "Admins manage articles" ON public.journal_articles
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage series" ON public.journal_series
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage entities" ON public.journal_entities
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage article entities" ON public.journal_article_entities
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage faqs" ON public.journal_article_faqs
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage citations" ON public.journal_article_citations
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sections" ON public.journal_article_sections
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed series
INSERT INTO public.journal_series (slug, title, description, order_index) VALUES
  ('property-intelligence-thesis', 'Property Intelligence Thesis', 'La thèse fondatrice d''UNPRO sur l''infrastructure d''intelligence de la propriété résidentielle.', 1),
  ('ai-operating-system', 'AI Operating System', 'Comment l''IA devient le système d''exploitation des services à domicile.', 2),
  ('trust-infrastructure', 'Trust Infrastructure', 'L''économie de la confiance opérationnelle dans les services réels.', 3);

-- Seed core entities
INSERT INTO public.journal_entities (slug, name, category, short_definition, long_definition) VALUES
  ('home-passport', 'Home Passport', 'product', 'Le jumeau numérique persistant d''une propriété résidentielle.', 'Le Home Passport est la mémoire structurée d''une propriété : historique d''entretien, composantes, factures, garanties, inspections, prédictions et risques. Il transforme la maison d''actif statique en système intelligent.'),
  ('property-memory', 'Property Memory', 'concept', 'La couche de mémoire long terme attachée à un bâtiment.', 'Property Memory désigne l''ensemble des données structurées et non-structurées qui composent l''historique vivant d''une propriété, accessibles aux propriétaires successifs, aux entrepreneurs autorisés et aux systèmes IA.'),
  ('ai-operating-system', 'AI Operating System', 'infrastructure', 'Le système d''exploitation IA qui orchestre les services résidentiels.', 'L''AI Operating System d''UNPRO orchestre intentions, prédictions, matching, booking et exécution sur le terrain. Il remplace le modèle de marketplace par une couche d''exécution autonome.'),
  ('property-intelligence', 'Property Intelligence', 'concept', 'L''intelligence prédictive appliquée au bâtiment résidentiel.', 'Property Intelligence regroupe les signaux, modèles et prédictions qui permettent d''anticiper les besoins d''une propriété : usure, risque, opportunité d''optimisation, conformité réglementaire.'),
  ('trust-infrastructure', 'Trust Infrastructure', 'infrastructure', 'L''infrastructure de confiance vérifiable entre propriétaires, professionnels et systèmes.', 'Trust Infrastructure désigne la couche technique et opérationnelle qui rend la confiance mesurable, vérifiable et programmable dans l''économie des services réels.'),
  ('semi-autonomous-organization', 'Semi-Autonomous Organization', 'concept', 'Une organisation où l''IA exécute et l''humain approuve.', 'La Semi-Autonomous Organization combine des agents IA exécutifs et opérationnels avec une couche d''approbation humaine, permettant une scalabilité sans inflation de masse salariale.'),
  ('ai-orchestration', 'AI Orchestration', 'infrastructure', 'La coordination d''agents IA spécialisés autour d''un objectif business.', 'AI Orchestration coordonne agents de prédiction, de matching, d''outreach, de support et d''exécution autour d''un graphe d''intentions partagé.'),
  ('alex', 'Alex', 'product', 'Le concierge vocal IA d''UNPRO.', 'Alex est l''interface conversationnelle d''UNPRO. Concierge décisif, voix française québécoise, recommande un seul professionnel par intention et déclenche directement la réservation.');
