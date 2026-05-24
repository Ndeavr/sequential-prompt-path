
-- AI ENTITY PROFILE SYSTEM
CREATE TABLE public.ai_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  legal_name TEXT,
  primary_service TEXT,
  primary_city TEXT,
  ai_summary TEXT,
  confidence_score INT NOT NULL DEFAULT 0,
  years_active INT,
  logo_url TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  lat NUMERIC,
  lng NUMERIC,
  contractor_id UUID,
  published BOOLEAN NOT NULL DEFAULT false,
  last_ingested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_entities_slug ON public.ai_entities(slug);
CREATE INDEX idx_ai_entities_published ON public.ai_entities(published) WHERE published = true;

CREATE TABLE public.ai_entity_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.ai_entities(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_sync TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_entity_sources_entity ON public.ai_entity_sources(entity_id);

CREATE TABLE public.ai_entity_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.ai_entities(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  rating NUMERIC,
  review_count INT,
  sentiment JSONB,
  themes TEXT[],
  source_url TEXT,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_entity_reviews_entity ON public.ai_entity_reviews(entity_id);

CREATE TABLE public.ai_entity_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.ai_entities(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'photo',
  source TEXT,
  ai_caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_entity_images_entity ON public.ai_entity_images(entity_id);

CREATE TABLE public.ai_entity_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL UNIQUE REFERENCES public.ai_entities(id) ON DELETE CASCADE,
  rbq_status TEXT NOT NULL DEFAULT 'unknown',
  rbq_number TEXT,
  neq_status TEXT NOT NULL DEFAULT 'unknown',
  neq_number TEXT,
  insurance_status TEXT NOT NULL DEFAULT 'unknown',
  google_verified BOOLEAN NOT NULL DEFAULT false,
  domain_https BOOLEAN NOT NULL DEFAULT false,
  recent_photos BOOLEAN NOT NULL DEFAULT false,
  recent_reviews BOOLEAN NOT NULL DEFAULT false,
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_entity_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.ai_entities(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  slug TEXT,
  frequency TEXT NOT NULL DEFAULT 'medium',
  evidence_url TEXT,
  evidence_snippet TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_entity_services_entity ON public.ai_entity_services(entity_id);

CREATE TABLE public.ai_entity_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.ai_entities(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  region TEXT,
  detected_from TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_entity_zones_entity ON public.ai_entity_zones(entity_id);

CREATE TABLE public.ai_entity_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.ai_entities(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  generated_from TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_entity_faq_entity ON public.ai_entity_faq(entity_id);

-- RLS — base tables: locked down. Public reads via view only.
ALTER TABLE public.ai_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_entity_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_entity_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_entity_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_entity_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_entity_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_entity_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_entity_faq ENABLE ROW LEVEL SECURITY;

-- Admin full access (relies on existing has_role)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    EXECUTE $p$CREATE POLICY "admin all ai_entities" ON public.ai_entities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role))$p$;
    EXECUTE $p$CREATE POLICY "admin all ai_entity_sources" ON public.ai_entity_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role))$p$;
    EXECUTE $p$CREATE POLICY "admin all ai_entity_reviews" ON public.ai_entity_reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role))$p$;
    EXECUTE $p$CREATE POLICY "admin all ai_entity_images" ON public.ai_entity_images FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role))$p$;
    EXECUTE $p$CREATE POLICY "admin all ai_entity_validations" ON public.ai_entity_validations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role))$p$;
    EXECUTE $p$CREATE POLICY "admin all ai_entity_services" ON public.ai_entity_services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role))$p$;
    EXECUTE $p$CREATE POLICY "admin all ai_entity_zones" ON public.ai_entity_zones FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role))$p$;
    EXECUTE $p$CREATE POLICY "admin all ai_entity_faq" ON public.ai_entity_faq FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role))$p$;
  END IF;
END$$;

-- Public-readable rows for published entities (entity row + related). RLS allows anon SELECT only when entity is published.
CREATE POLICY "public read published entities"
  ON public.ai_entities FOR SELECT TO anon, authenticated
  USING (published = true);

CREATE POLICY "public read images of published"
  ON public.ai_entity_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_entities e WHERE e.id = entity_id AND e.published = true));

CREATE POLICY "public read services of published"
  ON public.ai_entity_services FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_entities e WHERE e.id = entity_id AND e.published = true));

CREATE POLICY "public read zones of published"
  ON public.ai_entity_zones FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_entities e WHERE e.id = entity_id AND e.published = true));

CREATE POLICY "public read faq of published"
  ON public.ai_entity_faq FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_entities e WHERE e.id = entity_id AND e.published = true));

CREATE POLICY "public read reviews of published"
  ON public.ai_entity_reviews FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_entities e WHERE e.id = entity_id AND e.published = true));

CREATE POLICY "public read validations of published"
  ON public.ai_entity_validations FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_entities e WHERE e.id = entity_id AND e.published = true));

-- ai_entity_sources stays private (raw payloads can contain PII / scraped HTML). Admin only via earlier policy.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_ai_entities_updated BEFORE UPDATE ON public.ai_entities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ai_entity_sources_updated BEFORE UPDATE ON public.ai_entity_sources FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ai_entity_reviews_updated BEFORE UPDATE ON public.ai_entity_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ai_entity_validations_updated BEFORE UPDATE ON public.ai_entity_validations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Confidence score recompute
CREATE OR REPLACE FUNCTION public.recompute_ai_entity_score(p_entity UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v INT := 0;
  val RECORD;
  rev_count INT;
BEGIN
  SELECT * INTO val FROM public.ai_entity_validations WHERE entity_id = p_entity;
  IF FOUND THEN
    IF val.rbq_status = 'confirmed' THEN v := v + 20; END IF;
    IF val.neq_status = 'confirmed' THEN v := v + 15; END IF;
    IF val.insurance_status = 'confirmed' THEN v := v + 10; END IF;
    IF val.google_verified THEN v := v + 15; END IF;
    IF val.domain_https THEN v := v + 5; END IF;
    IF val.recent_photos THEN v := v + 5; END IF;
    IF val.recent_reviews THEN v := v + 5; END IF;
  END IF;
  SELECT COALESCE(SUM(review_count), 0) INTO rev_count FROM public.ai_entity_reviews WHERE entity_id = p_entity;
  IF rev_count >= 50 THEN v := v + 15;
  ELSIF rev_count >= 10 THEN v := v + 10;
  ELSIF rev_count >= 1 THEN v := v + 5; END IF;
  IF EXISTS (SELECT 1 FROM public.ai_entity_services WHERE entity_id = p_entity) THEN v := v + 5; END IF;
  IF EXISTS (SELECT 1 FROM public.ai_entity_zones WHERE entity_id = p_entity) THEN v := v + 5; END IF;
  UPDATE public.ai_entities SET confidence_score = LEAST(v, 100), updated_at = now() WHERE id = p_entity;
END $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_ai_entity_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.recompute_ai_entity_score(COALESCE(NEW.entity_id, OLD.entity_id));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_score_validations AFTER INSERT OR UPDATE OR DELETE ON public.ai_entity_validations FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_ai_entity_score();
CREATE TRIGGER trg_score_reviews AFTER INSERT OR UPDATE OR DELETE ON public.ai_entity_reviews FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_ai_entity_score();
CREATE TRIGGER trg_score_services AFTER INSERT OR DELETE ON public.ai_entity_services FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_ai_entity_score();
CREATE TRIGGER trg_score_zones AFTER INSERT OR DELETE ON public.ai_entity_zones FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_ai_entity_score();
