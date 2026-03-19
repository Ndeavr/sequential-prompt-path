
ALTER TABLE public.property_scores
ADD COLUMN IF NOT EXISTS source text DEFAULT 'system';

ALTER TABLE public.property_recommendations
ADD COLUMN IF NOT EXISTS source text DEFAULT 'system',
ADD COLUMN IF NOT EXISTS source_ref text;

ALTER TABLE public.property_documents
ADD COLUMN IF NOT EXISTS extracted_json jsonb DEFAULT '{}'::jsonb;
