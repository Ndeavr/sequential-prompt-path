
-- 1) Categories
CREATE TABLE public.content_image_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_image_categories TO anon, authenticated;
GRANT ALL ON public.content_image_categories TO service_role;
ALTER TABLE public.content_image_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.content_image_categories FOR SELECT USING (true);
CREATE POLICY "admins manage categories" ON public.content_image_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Rules
CREATE TABLE public.content_image_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.content_image_categories(id) ON DELETE CASCADE,
  allowed_tags TEXT[] NOT NULL DEFAULT '{}',
  blocked_tags TEXT[] NOT NULL DEFAULT '{}',
  required_tags TEXT[] NOT NULL DEFAULT '{}',
  style_prompt TEXT NOT NULL DEFAULT '',
  negative_prompt TEXT NOT NULL DEFAULT '',
  min_confidence NUMERIC NOT NULL DEFAULT 0.7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);
GRANT SELECT ON public.content_image_rules TO anon, authenticated;
GRANT ALL ON public.content_image_rules TO service_role;
ALTER TABLE public.content_image_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read rules" ON public.content_image_rules FOR SELECT USING (true);
CREATE POLICY "admins manage rules" ON public.content_image_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Library
CREATE TABLE public.content_image_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.content_image_categories(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  detected_tags TEXT[] NOT NULL DEFAULT '{}',
  violates_blocked TEXT[] NOT NULL DEFAULT '{}',
  missing_required TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated','uploaded','stock')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','manual')),
  confidence NUMERIC NOT NULL DEFAULT 0,
  rejected_reason TEXT,
  prompt_used TEXT,
  model_used TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cil_category_status ON public.content_image_library(category_id, status);
GRANT SELECT ON public.content_image_library TO anon, authenticated;
GRANT ALL ON public.content_image_library TO service_role;
ALTER TABLE public.content_image_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read approved images" ON public.content_image_library FOR SELECT USING (status = 'approved' OR status = 'manual');
CREATE POLICY "admins read all images" ON public.content_image_library FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage images" ON public.content_image_library FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Article ↔ image assignments
CREATE TABLE public.content_article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  article_url TEXT,
  category_id UUID REFERENCES public.content_image_categories(id) ON DELETE SET NULL,
  image_id UUID REFERENCES public.content_image_library(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','manual')),
  contrast_score NUMERIC,
  readability_status TEXT,
  override_reason TEXT,
  last_audited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(article_id)
);
CREATE INDEX idx_cai_status ON public.content_article_images(status);
CREATE INDEX idx_cai_category ON public.content_article_images(category_id);
GRANT SELECT ON public.content_article_images TO anon, authenticated;
GRANT ALL ON public.content_article_images TO service_role;
ALTER TABLE public.content_article_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read article images" ON public.content_article_images FOR SELECT USING (true);
CREATE POLICY "admins manage article images" ON public.content_article_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) updated_at triggers
CREATE TRIGGER trg_cic_updated BEFORE UPDATE ON public.content_image_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cir_updated BEFORE UPDATE ON public.content_image_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cil_updated BEFORE UPDATE ON public.content_image_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cai_updated BEFORE UPDATE ON public.content_article_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Seed categories
INSERT INTO public.content_image_categories (slug, label, description) VALUES
  ('attic-insulation', 'Isolation d''entretoit', 'Entretoits non finis québécois, fibre soufflée sur plancher.'),
  ('roofing', 'Toiture', 'Toitures québécoises: bardeaux, membrane, tôle.'),
  ('plumbing', 'Plomberie', 'Plomberie résidentielle québécoise.'),
  ('hvac', 'Chauffage / Climatisation', 'Systèmes CVC résidentiels québécois.'),
  ('foundation', 'Fondation', 'Fondations en béton, fissures, drain français.'),
  ('exterior', 'Extérieur', 'Revêtements, portes, fenêtres résidentiels.'),
  ('general', 'Général', 'Contenu résidentiel générique du Québec.')
ON CONFLICT (slug) DO NOTHING;

-- 7) Seed attic-insulation rule
INSERT INTO public.content_image_rules (category_id, allowed_tags, blocked_tags, required_tags, style_prompt, negative_prompt, min_confidence)
SELECT
  id,
  ARRAY['unfinished attic','blown fiberglass','pink insulation','attic floor','wood trusses','soffit vents','attic hatch','low headroom','loose fill insulation'],
  ARRAY['window','finished attic','drywall ceiling','cathedral ceiling','insulated wall cavity','living space','furniture','worker posing','cellulose bag','european roof','spray foam wall'],
  ARRAY['unfinished attic'],
  'Real photograph of a Quebec residential unfinished attic space viewed from the attic hatch: low headroom, exposed wood roof trusses and rafters, thick layer of loose-fill pink fiberglass insulation blanketing the attic floor between joists, soffit baffles visible along eaves, no drywall, no windows, no living space. Natural work-light. Documentary style, sharp focus, wide angle.',
  'no windows, no finished rooms, no cathedral ceiling, no drywall walls, no furniture, no people posing, no European tile roof, no spray foam on walls, no insulated wall cavities, no cellulose bags',
  0.7
FROM public.content_image_categories WHERE slug = 'attic-insulation'
ON CONFLICT (category_id) DO NOTHING;
