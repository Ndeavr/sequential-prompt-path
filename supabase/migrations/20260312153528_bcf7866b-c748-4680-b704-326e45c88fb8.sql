
-- V3 Ingestion System Tables

-- Enum for ingestion job status
CREATE TYPE public.ingestion_job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'partial');

-- Enum for document types
CREATE TYPE public.ingestion_doc_type AS ENUM ('tax_bill', 'contractor_quote', 'reserve_fund_study', 'inspection_report', 'maintenance_document', 'insurance_certificate', 'other');

-- 1. ingestion_jobs — tracks batch ingestion runs
CREATE TABLE public.ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status ingestion_job_status NOT NULL DEFAULT 'pending',
  job_type TEXT NOT NULL DEFAULT 'document_analysis',
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_log JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ingestion jobs" ON public.ingestion_jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all ingestion jobs" ON public.ingestion_jobs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages ingestion jobs" ON public.ingestion_jobs FOR ALL TO service_role USING (true);

-- 2. ingestion_job_items — individual items within a job
CREATE TABLE public.ingestion_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.ingestion_jobs(id) ON DELETE CASCADE,
  document_id UUID,
  doc_type ingestion_doc_type NOT NULL DEFAULT 'other',
  status ingestion_job_status NOT NULL DEFAULT 'pending',
  storage_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  extraction_result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ingestion_job_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job items" ON public.ingestion_job_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ingestion_jobs j WHERE j.id = ingestion_job_items.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Admins can manage all job items" ON public.ingestion_job_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages job items" ON public.ingestion_job_items FOR ALL TO service_role USING (true);

-- 3. document_entities — extracted entities from documents
CREATE TABLE public.document_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  job_item_id UUID REFERENCES public.ingestion_job_items(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_value TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  source_page INTEGER,
  source_text TEXT,
  normalized_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document entities" ON public.document_entities FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ingestion_job_items ji JOIN public.ingestion_jobs j ON j.id = ji.job_id WHERE ji.id = document_entities.job_item_id AND j.user_id = auth.uid()));
CREATE POLICY "Admins can manage all document entities" ON public.document_entities FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages document entities" ON public.document_entities FOR ALL TO service_role USING (true);

-- 4. document_chunks — chunked text from documents for RAG
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  job_item_id UUID REFERENCES public.ingestion_job_items(id) ON DELETE SET NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  page_number INTEGER,
  section_title TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document chunks" ON public.document_chunks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.ingestion_job_items ji JOIN public.ingestion_jobs j ON j.id = ji.job_id WHERE ji.id = document_chunks.job_item_id AND j.user_id = auth.uid()));
CREATE POLICY "Admins can manage all document chunks" ON public.document_chunks FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages document chunks" ON public.document_chunks FOR ALL TO service_role USING (true);

-- 5. property_ai_extractions — structured AI output per property
CREATE TABLE public.property_ai_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  job_item_id UUID REFERENCES public.ingestion_job_items(id) ON DELETE SET NULL,
  extraction_type TEXT NOT NULL,
  structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  model_used TEXT,
  source_doc_type ingestion_doc_type,
  validated BOOLEAN DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_ai_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property members can view extractions" ON public.property_ai_extractions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.property_members pm WHERE pm.property_id = property_ai_extractions.property_id AND pm.user_id = auth.uid()));
CREATE POLICY "Admins can manage all extractions" ON public.property_ai_extractions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages extractions" ON public.property_ai_extractions FOR ALL TO service_role USING (true);

-- 6. property_aliases — alternate addresses/names for dedup
CREATE TABLE public.property_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  alias_type TEXT NOT NULL DEFAULT 'address',
  alias_value TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  confidence NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property members can view aliases" ON public.property_aliases FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.property_members pm WHERE pm.property_id = property_aliases.property_id AND pm.user_id = auth.uid()));
CREATE POLICY "Admins can manage all aliases" ON public.property_aliases FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages aliases" ON public.property_aliases FOR ALL TO service_role USING (true);

-- 7. property_source_links — links to source documents
CREATE TABLE public.property_source_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  source_url TEXT,
  extraction_id UUID REFERENCES public.property_ai_extractions(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE public.property_source_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property members can view source links" ON public.property_source_links FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.property_members pm WHERE pm.property_id = property_source_links.property_id AND pm.user_id = auth.uid()));
CREATE POLICY "Admins can manage all source links" ON public.property_source_links FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages source links" ON public.property_source_links FOR ALL TO service_role USING (true);

-- 8. property_master_records — canonical property data
CREATE TABLE public.property_master_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE UNIQUE,
  canonical_address TEXT,
  canonical_city TEXT,
  canonical_province TEXT,
  canonical_postal_code TEXT,
  lot_number TEXT,
  cadastral_number TEXT,
  municipal_evaluation NUMERIC,
  land_area_sqft NUMERIC,
  building_area_sqft NUMERIC,
  year_built INTEGER,
  building_type TEXT,
  unit_count INTEGER DEFAULT 1,
  last_tax_year INTEGER,
  tax_amount NUMERIC,
  data_sources JSONB DEFAULT '[]'::jsonb,
  confidence_score NUMERIC DEFAULT 0,
  last_enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_master_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property members can view master record" ON public.property_master_records FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.property_members pm WHERE pm.property_id = property_master_records.property_id AND pm.user_id = auth.uid()));
CREATE POLICY "Admins can manage all master records" ON public.property_master_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages master records" ON public.property_master_records FOR ALL TO service_role USING (true);

-- 9. property_merge_candidates — potential duplicate properties
CREATE TABLE public.property_merge_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_a_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  property_b_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  similarity_score NUMERIC NOT NULL DEFAULT 0,
  match_reasons JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  merged_into_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.property_merge_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage merge candidates" ON public.property_merge_candidates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages merge candidates" ON public.property_merge_candidates FOR ALL TO service_role USING (true);

-- Indexes
CREATE INDEX idx_ingestion_jobs_user ON public.ingestion_jobs(user_id);
CREATE INDEX idx_ingestion_jobs_status ON public.ingestion_jobs(status);
CREATE INDEX idx_ingestion_job_items_job ON public.ingestion_job_items(job_id);
CREATE INDEX idx_document_entities_job_item ON public.document_entities(job_item_id);
CREATE INDEX idx_document_entities_type ON public.document_entities(entity_type);
CREATE INDEX idx_document_chunks_job_item ON public.document_chunks(job_item_id);
CREATE INDEX idx_property_ai_extractions_property ON public.property_ai_extractions(property_id);
CREATE INDEX idx_property_aliases_property ON public.property_aliases(property_id);
CREATE INDEX idx_property_source_links_property ON public.property_source_links(property_id);
CREATE INDEX idx_property_master_records_property ON public.property_master_records(property_id);
CREATE INDEX idx_property_merge_candidates_a ON public.property_merge_candidates(property_a_id);
CREATE INDEX idx_property_merge_candidates_b ON public.property_merge_candidates(property_b_id);
