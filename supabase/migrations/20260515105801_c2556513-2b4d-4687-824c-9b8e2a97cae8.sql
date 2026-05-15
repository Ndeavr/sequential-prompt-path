-- Storage bucket for brand assets (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Brand assets public read" ON storage.objects;
CREATE POLICY "Brand assets public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

-- Only service role writes (no public/authenticated insert/update/delete policies)
DROP POLICY IF EXISTS "Brand assets service write" ON storage.objects;
DROP POLICY IF EXISTS "Brand assets service update" ON storage.objects;
DROP POLICY IF EXISTS "Brand assets service delete" ON storage.objects;

-- Brand tracking columns
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS logo_source text,
  ADD COLUMN IF NOT EXISTS logo_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS logo_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_last_error text;

-- Index for brand_logos lookups
CREATE INDEX IF NOT EXISTS idx_brand_logos_brand_variant
  ON public.brand_logos (brand_id, variant);