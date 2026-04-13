
-- Brand assets (logos, icons, watermarks)
CREATE TABLE public.brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL DEFAULT 'logo' CHECK (asset_type IN ('logo','icon','watermark')),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light','dark')),
  label TEXT,
  url TEXT NOT NULL,
  width INT,
  height INT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_assets_public_read" ON public.brand_assets FOR SELECT USING (true);

-- Brand rules (placement / enforcement)
CREATE TABLE public.brand_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'top-left',
  size_ratio NUMERIC NOT NULL DEFAULT 0.15,
  padding_px INT NOT NULL DEFAULT 12,
  enforce_override BOOLEAN NOT NULL DEFAULT true,
  blocked_patterns TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_rules_public_read" ON public.brand_rules FOR SELECT USING (true);

-- Brand logs (audit)
CREATE TABLE public.brand_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_ref TEXT,
  template_id UUID,
  override_applied BOOLEAN NOT NULL DEFAULT false,
  previous_brand_detected TEXT,
  asset_used_id UUID REFERENCES public.brand_assets(id),
  rule_used_id UUID REFERENCES public.brand_rules(id),
  channel TEXT DEFAULT 'sms',
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_logs_public_read" ON public.brand_logs FOR SELECT USING (true);

-- Seed default assets
INSERT INTO public.brand_assets (asset_type, theme, label, url, is_default) VALUES
  ('logo', 'light', 'UNPRO Logo White', '/brand/unpro-logo-white.svg', true),
  ('logo', 'dark', 'UNPRO Logo Dark', '/brand/unpro-logo-dark.svg', true),
  ('icon', 'light', 'UNPRO Icon White', '/brand/unpro-icon-white.svg', false),
  ('icon', 'dark', 'UNPRO Icon Dark', '/brand/unpro-icon-dark.svg', false);

-- Seed default rule
INSERT INTO public.brand_rules (rule_name, placement, size_ratio, padding_px, enforce_override, blocked_patterns) VALUES
  ('default_sms', 'top-left', 0.15, 12, true, ARRAY['lovable','Lovable','powered by','Made with']);
