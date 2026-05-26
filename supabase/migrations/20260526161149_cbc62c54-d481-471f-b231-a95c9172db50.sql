
-- =====================================================
-- AIPP MAX — Vague 1: tables additives uniquement
-- =====================================================

-- 1) Embeddings vectoriels pour retrieval LLM (knowledge graph)
CREATE TABLE IF NOT EXISTS public.contractor_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  chunk_type TEXT NOT NULL, -- 'service' | 'review' | 'faq' | 'media' | 'summary' | 'page' | 'proof'
  chunk_text TEXT NOT NULL,
  source_ref TEXT, -- url / id origine
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contractor_embeddings_contractor_idx
  ON public.contractor_embeddings(contractor_id);
CREATE INDEX IF NOT EXISTS contractor_embeddings_type_idx
  ON public.contractor_embeddings(chunk_type);
CREATE INDEX IF NOT EXISTS contractor_embeddings_vector_idx
  ON public.contractor_embeddings USING hnsw (embedding vector_cosine_ops);

GRANT SELECT ON public.contractor_embeddings TO anon, authenticated;
GRANT ALL ON public.contractor_embeddings TO service_role;

ALTER TABLE public.contractor_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Embeddings publicly readable"
  ON public.contractor_embeddings FOR SELECT
  USING (true);

CREATE POLICY "Service role manages embeddings"
  ON public.contractor_embeddings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- 2) Pages SEO/AEO auto-générées (city × service × contractor)
CREATE TABLE IF NOT EXISTS public.aipp_geo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  service TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  content_md TEXT NOT NULL,
  jsonld JSONB NOT NULL DEFAULT '{}'::jsonb,
  faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  hero_image_url TEXT,
  published_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aipp_geo_pages_contractor_idx
  ON public.aipp_geo_pages(contractor_id);
CREATE INDEX IF NOT EXISTS aipp_geo_pages_city_service_idx
  ON public.aipp_geo_pages(city, service);

GRANT SELECT ON public.aipp_geo_pages TO anon, authenticated;
GRANT ALL ON public.aipp_geo_pages TO service_role;

ALTER TABLE public.aipp_geo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Geo pages publicly readable when published"
  ON public.aipp_geo_pages FOR SELECT
  USING (published_at IS NOT NULL);

CREATE POLICY "Service role manages geo pages"
  ON public.aipp_geo_pages FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


-- 3) Fonction RPC: similarity search sur embeddings
CREATE OR REPLACE FUNCTION public.match_contractor_chunks(
  query_embedding vector(1536),
  filter_contractor_id UUID DEFAULT NULL,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  contractor_id UUID,
  chunk_type TEXT,
  chunk_text TEXT,
  source_ref TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    e.id,
    e.contractor_id,
    e.chunk_type,
    e.chunk_text,
    e.source_ref,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.contractor_embeddings e
  WHERE filter_contractor_id IS NULL OR e.contractor_id = filter_contractor_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_contractor_chunks(vector, UUID, INT) TO anon, authenticated, service_role;


-- 4) Trigger updated_at sur aipp_geo_pages
CREATE TRIGGER aipp_geo_pages_set_updated_at
BEFORE UPDATE ON public.aipp_geo_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
