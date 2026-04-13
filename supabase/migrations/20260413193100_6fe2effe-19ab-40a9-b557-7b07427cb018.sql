
-- SMS Image Templates
CREATE TABLE public.sms_image_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_slug TEXT,
  city_slug TEXT,
  user_type TEXT DEFAULT 'homeowner',
  image_url TEXT,
  title_text TEXT,
  subtitle_text TEXT,
  cta_text TEXT DEFAULT 'Voir mon estimation',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SMS Image Rules (priority-based matching)
CREATE TABLE public.sms_image_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority INTEGER DEFAULT 0,
  service_match TEXT,
  city_match TEXT,
  user_type_match TEXT,
  intent_match TEXT,
  template_id UUID REFERENCES public.sms_image_templates(id) ON DELETE SET NULL,
  fallback_type TEXT DEFAULT 'generic' CHECK (fallback_type IN ('specific','service','generic','none')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SMS Image Logs
CREATE TABLE public.sms_image_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT,
  template_id UUID REFERENCES public.sms_image_templates(id) ON DELETE SET NULL,
  template_name TEXT,
  fallback_used BOOLEAN DEFAULT false,
  fallback_type TEXT,
  click BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,
  service_slug TEXT,
  city_slug TEXT,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sms_templates_service ON public.sms_image_templates(service_slug);
CREATE INDEX idx_sms_templates_city ON public.sms_image_templates(city_slug);
CREATE INDEX idx_sms_templates_active ON public.sms_image_templates(is_active);
CREATE INDEX idx_sms_rules_priority ON public.sms_image_rules(priority DESC);
CREATE INDEX idx_sms_logs_created ON public.sms_image_logs(created_at DESC);
CREATE INDEX idx_sms_logs_template ON public.sms_image_logs(template_id);

-- RLS
ALTER TABLE public.sms_image_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_image_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_image_logs ENABLE ROW LEVEL SECURITY;

-- Templates: public read for active, authenticated write
CREATE POLICY "Anyone can read active templates" ON public.sms_image_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users manage templates" ON public.sms_image_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rules: authenticated full access
CREATE POLICY "Authenticated users manage rules" ON public.sms_image_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Logs: authenticated read, service_role insert
CREATE POLICY "Authenticated users read logs" ON public.sms_image_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert logs" ON public.sms_image_logs FOR INSERT WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_sms_image_templates_updated_at
  BEFORE UPDATE ON public.sms_image_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
