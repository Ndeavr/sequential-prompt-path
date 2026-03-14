
-- Block 2: Extend properties table for property-centric architecture
-- All columns nullable with defaults — migration-safe, no breaking changes

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_status TEXT DEFAULT 'estimated';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS claimed_by UUID;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS normalized_address TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS street_number TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS street_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'CA';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS full_address TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS estimated_score INTEGER;

-- Unique index on slug (partial — only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug) WHERE slug IS NOT NULL;

-- Index for public lookups
CREATE INDEX IF NOT EXISTS idx_properties_public_status ON public.properties(public_status);
CREATE INDEX IF NOT EXISTS idx_properties_normalized_address ON public.properties(normalized_address);
CREATE INDEX IF NOT EXISTS idx_properties_claimed_by ON public.properties(claimed_by);

-- RLS policy for public read access on properties with public_status
CREATE POLICY "Public can view public property pages"
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (public_status IS NOT NULL AND public_status != 'private');
