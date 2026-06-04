
-- ============ contractor_entities ============
CREATE TABLE IF NOT EXISTS public.contractor_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE CASCADE,
  rbq_number text,
  specialties text[] DEFAULT '{}',
  cities text[] DEFAULT '{}',
  regions text[] DEFAULT '{}',
  service_radius_km integer,
  years_experience integer,
  licenses jsonb DEFAULT '[]'::jsonb,
  certifications text[] DEFAULT '{}',
  brands text[] DEFAULT '{}',
  materials text[] DEFAULT '{}',
  review_summary text,
  pros text[] DEFAULT '{}',
  cons text[] DEFAULT '{}',
  faq jsonb DEFAULT '[]'::jsonb,
  source_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_entities_contractor_id ON public.contractor_entities(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_entities_rbq ON public.contractor_entities(rbq_number);
CREATE INDEX IF NOT EXISTS idx_contractor_entities_cities ON public.contractor_entities USING GIN(cities);
CREATE INDEX IF NOT EXISTS idx_contractor_entities_specialties ON public.contractor_entities USING GIN(specialties);

GRANT SELECT ON public.contractor_entities TO anon, authenticated;
GRANT ALL ON public.contractor_entities TO service_role;

ALTER TABLE public.contractor_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_entities_public_read"
  ON public.contractor_entities FOR SELECT
  USING (true);

CREATE POLICY "contractor_entities_service_write"
  ON public.contractor_entities FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============ property_graph ============
CREATE TABLE IF NOT EXISTS public.property_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  node_type text NOT NULL,
  -- one of: document, facture, soumission, photo, garantie, inspection,
  --        sinistre, entrepreneur, ai_recommendation, risk, timeline_event
  title text,
  body text,
  payload jsonb DEFAULT '{}'::jsonb,
  related_contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  occurred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_graph_property_id ON public.property_graph(property_id);
CREATE INDEX IF NOT EXISTS idx_property_graph_owner ON public.property_graph(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_property_graph_type ON public.property_graph(node_type);
CREATE INDEX IF NOT EXISTS idx_property_graph_occurred ON public.property_graph(occurred_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_graph TO authenticated;
GRANT ALL ON public.property_graph TO service_role;

ALTER TABLE public.property_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_graph_owner_select"
  ON public.property_graph FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "property_graph_owner_insert"
  ON public.property_graph FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "property_graph_owner_update"
  ON public.property_graph FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "property_graph_owner_delete"
  ON public.property_graph FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "property_graph_service_all"
  ON public.property_graph FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============ truth_layer_article_topics ============
CREATE TABLE IF NOT EXISTS public.truth_layer_article_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  intent text,
  target_keywords text[] DEFAULT '{}',
  city text,
  status text NOT NULL DEFAULT 'queued',
  -- queued | draft | review | published
  generated_article_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truth_layer_topics_status ON public.truth_layer_article_topics(status);
CREATE INDEX IF NOT EXISTS idx_truth_layer_topics_category ON public.truth_layer_article_topics(category);

GRANT SELECT ON public.truth_layer_article_topics TO anon, authenticated;
GRANT ALL ON public.truth_layer_article_topics TO service_role;

ALTER TABLE public.truth_layer_article_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "truth_layer_topics_public_read"
  ON public.truth_layer_article_topics FOR SELECT
  USING (true);

CREATE POLICY "truth_layer_topics_service_all"
  ON public.truth_layer_article_topics FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.tl_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_contractor_entities_updated ON public.contractor_entities;
CREATE TRIGGER trg_contractor_entities_updated
  BEFORE UPDATE ON public.contractor_entities
  FOR EACH ROW EXECUTE FUNCTION public.tl_set_updated_at();

DROP TRIGGER IF EXISTS trg_property_graph_updated ON public.property_graph;
CREATE TRIGGER trg_property_graph_updated
  BEFORE UPDATE ON public.property_graph
  FOR EACH ROW EXECUTE FUNCTION public.tl_set_updated_at();

DROP TRIGGER IF EXISTS trg_truth_layer_topics_updated ON public.truth_layer_article_topics;
CREATE TRIGGER trg_truth_layer_topics_updated
  BEFORE UPDATE ON public.truth_layer_article_topics
  FOR EACH ROW EXECUTE FUNCTION public.tl_set_updated_at();
