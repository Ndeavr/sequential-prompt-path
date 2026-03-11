
-- Media assets table for AI Media Orchestrator
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_prompt text NOT NULL,
  optimized_prompt text,
  asset_type text NOT NULL DEFAULT 'image',
  purpose text NOT NULL DEFAULT 'general',
  target_page text,
  target_entity_id uuid,
  target_entity_type text,
  
  -- Generation metadata
  models_used text[] DEFAULT '{}',
  generation_strategy text DEFAULT 'single',
  variations_count integer DEFAULT 1,
  
  -- Selected asset
  storage_path text,
  storage_url text,
  thumbnail_url text,
  
  -- Quality scores
  overall_score numeric DEFAULT 0,
  realism_score numeric DEFAULT 0,
  clarity_score numeric DEFAULT 0,
  brand_consistency_score numeric DEFAULT 0,
  composition_score numeric DEFAULT 0,
  
  -- Technical specs
  width integer,
  height integer,
  aspect_ratio text DEFAULT '16:9',
  file_format text DEFAULT 'webp',
  file_size integer,
  alt_text text,
  seo_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Variations data (base64 candidates before selection)
  variations jsonb DEFAULT '[]'::jsonb,
  
  -- Style
  style_preset text DEFAULT 'unpro-premium',
  color_palette jsonb,
  
  -- Status
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  
  -- Audit
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  generated_at timestamptz,
  approved_at timestamptz,
  approved_by uuid
);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all media assets" ON public.media_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages media assets" ON public.media_assets FOR ALL TO service_role USING (true);
CREATE POLICY "Anyone can view approved media" ON public.media_assets FOR SELECT TO public USING (status = 'approved');

-- Indexes
CREATE INDEX idx_media_assets_status ON public.media_assets(status);
CREATE INDEX idx_media_assets_type ON public.media_assets(asset_type);
CREATE INDEX idx_media_assets_purpose ON public.media_assets(purpose);
CREATE INDEX idx_media_assets_target ON public.media_assets(target_entity_type, target_entity_id);

-- Storage bucket for generated media
INSERT INTO storage.buckets (id, name, public) VALUES ('media-assets', 'media-assets', true);

-- Storage policies for media-assets bucket
CREATE POLICY "Admins can manage media files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'media-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'media-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages media files" ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'media-assets')
  WITH CHECK (bucket_id = 'media-assets');

CREATE POLICY "Anyone can view media files" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'media-assets');
