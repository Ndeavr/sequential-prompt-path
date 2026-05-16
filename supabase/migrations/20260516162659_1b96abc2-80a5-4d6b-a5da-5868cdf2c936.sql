
-- ============================================================
-- AEO Domination — Phase 1: Semantic Foundation
-- ============================================================

-- Helper: admin check (relies on existing has_role + app_role)
-- All write policies use: public.has_role(auth.uid(), 'admin')

-- ---------- Lookup tables ----------

CREATE TABLE IF NOT EXISTS public.aeo_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  label_en text,
  description_fr text,
  category text,
  urgency_default text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aeo_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  label_en text,
  problem_slug text REFERENCES public.aeo_problems(slug) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aeo_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  label_en text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aeo_regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  label_en text,
  authority text,
  reference_url text,
  summary_fr text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aeo_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  label_en text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aeo_seasonal_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  season text NOT NULL,
  description_fr text,
  related_problem_slugs text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aeo_building_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  label_en text,
  typical_era text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aeo_neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  city_slug text NOT NULL,
  postal_prefix text,
  housing_notes_fr text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aeo_neighborhoods_city_idx ON public.aeo_neighborhoods(city_slug);

-- ---------- Page registries ----------

CREATE TABLE IF NOT EXISTS public.aeo_service_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_url text UNIQUE NOT NULL,
  service_slug text NOT NULL,
  city_slug text NOT NULL,
  contractor_slug text,
  status text NOT NULL DEFAULT 'draft',
  semantic_uniqueness_score numeric DEFAULT 0,
  indexable boolean NOT NULL DEFAULT false,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aeo_service_pages_lookup_idx
  ON public.aeo_service_pages(service_slug, city_slug);

CREATE TABLE IF NOT EXISTS public.aeo_problem_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_url text UNIQUE NOT NULL,
  problem_slug text NOT NULL,
  city_slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  semantic_uniqueness_score numeric DEFAULT 0,
  indexable boolean NOT NULL DEFAULT false,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aeo_problem_pages_lookup_idx
  ON public.aeo_problem_pages(problem_slug, city_slug);

CREATE TABLE IF NOT EXISTS public.aeo_comparison_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_url text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  title_fr text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  semantic_uniqueness_score numeric DEFAULT 0,
  indexable boolean NOT NULL DEFAULT false,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aeo_trust_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_url text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  title_fr text NOT NULL,
  topic text,
  status text NOT NULL DEFAULT 'draft',
  indexable boolean NOT NULL DEFAULT false,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Semantic foundation ----------

CREATE TABLE IF NOT EXISTS public.aeo_intent_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text NOT NULL,
  primary_intent text NOT NULL,
  secondary_intents text[] NOT NULL DEFAULT ARRAY[]::text[],
  symptoms text[] NOT NULL DEFAULT ARRAY[]::text[],
  confidence numeric NOT NULL DEFAULT 0.5,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_url)
);

CREATE TABLE IF NOT EXISTS public.aeo_semantic_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_type text NOT NULL,
  from_entity_id text NOT NULL,
  to_entity_type text NOT NULL,
  to_entity_id text NOT NULL,
  edge_type text NOT NULL,
  weight numeric NOT NULL DEFAULT 1.0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_entity_type, from_entity_id, to_entity_type, to_entity_id, edge_type)
);
CREATE INDEX IF NOT EXISTS aeo_edges_from_idx
  ON public.aeo_semantic_edges(from_entity_type, from_entity_id);
CREATE INDEX IF NOT EXISTS aeo_edges_to_idx
  ON public.aeo_semantic_edges(to_entity_type, to_entity_id);

CREATE TABLE IF NOT EXISTS public.aeo_entity_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  fact_key text NOT NULL,
  fact_value jsonb NOT NULL,
  source text,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, fact_key)
);
CREATE INDEX IF NOT EXISTS aeo_entity_facts_lookup_idx
  ON public.aeo_entity_facts(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.aeo_page_freshness_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text UNIQUE NOT NULL,
  weather_ctx jsonb,
  season text,
  hydro_rate numeric,
  demand_signal numeric,
  last_refreshed timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.aeo_extraction_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text NOT NULL,
  block_type text NOT NULL,
  content_fr text,
  content_en text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_url, block_type)
);
CREATE INDEX IF NOT EXISTS aeo_extraction_blocks_page_idx
  ON public.aeo_extraction_blocks(page_url);

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.aeo_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'aeo_problems','aeo_service_pages','aeo_problem_pages','aeo_comparison_pages',
    'aeo_trust_pages','aeo_intent_vectors','aeo_extraction_blocks'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aeo_touch_updated_at()', t, t);
  END LOOP;
END $$;

-- ---------- RLS: public read, admin write ----------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'aeo_problems','aeo_symptoms','aeo_materials','aeo_regulations','aeo_equipment',
    'aeo_seasonal_patterns','aeo_building_types','aeo_neighborhoods',
    'aeo_service_pages','aeo_problem_pages','aeo_comparison_pages','aeo_trust_pages',
    'aeo_intent_vectors','aeo_semantic_edges','aeo_entity_facts',
    'aeo_page_freshness_signals','aeo_extraction_blocks'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I read" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%I read" ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I admin write" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%I admin write" ON public.%I FOR ALL USING (public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))', t, t);
  END LOOP;
END $$;
