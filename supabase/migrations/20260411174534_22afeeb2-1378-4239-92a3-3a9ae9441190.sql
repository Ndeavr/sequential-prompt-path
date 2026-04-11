
-- Share Image Templates
CREATE TABLE public.share_image_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'homeowner_problem',
  layout_type TEXT NOT NULL DEFAULT 'overlay',
  background_type TEXT NOT NULL DEFAULT 'image',
  font_style TEXT NOT NULL DEFAULT 'default',
  text_rules_json JSONB NOT NULL DEFAULT '{}',
  image_rules_json JSONB NOT NULL DEFAULT '{}',
  brand_rules_json JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.share_image_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage share_image_templates"
  ON public.share_image_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Share Image Assets
CREATE TABLE public.share_image_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'background',
  url TEXT NOT NULL,
  focal_point TEXT DEFAULT 'center',
  category TEXT DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.share_image_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage share_image_assets"
  ON public.share_image_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Share Image Variants
CREATE TABLE public.share_image_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.share_image_templates(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL DEFAULT 'A',
  title_text TEXT NOT NULL,
  subtitle_text TEXT,
  image_asset_id UUID REFERENCES public.share_image_assets(id) ON DELETE SET NULL,
  performance_score NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.share_image_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage share_image_variants"
  ON public.share_image_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Share Image Generations
CREATE TABLE public.share_image_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_link_id UUID,
  template_id UUID REFERENCES public.share_image_templates(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.share_image_variants(id) ON DELETE SET NULL,
  generated_image_url TEXT,
  width INT NOT NULL DEFAULT 1200,
  height INT NOT NULL DEFAULT 630,
  generation_time_ms INT,
  intent TEXT,
  persona TEXT,
  city TEXT,
  service TEXT,
  contractor_name TEXT,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.share_image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage share_image_generations"
  ON public.share_image_generations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_share_image_templates_intent ON public.share_image_templates(intent);
CREATE INDEX idx_share_image_variants_template ON public.share_image_variants(template_id);
CREATE INDEX idx_share_image_generations_template ON public.share_image_generations(template_id);
CREATE INDEX idx_share_image_generations_created ON public.share_image_generations(created_at DESC);

-- Updated_at triggers
CREATE TRIGGER update_share_image_templates_updated_at
  BEFORE UPDATE ON public.share_image_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_share_image_assets_updated_at
  BEFORE UPDATE ON public.share_image_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_share_image_variants_updated_at
  BEFORE UPDATE ON public.share_image_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
