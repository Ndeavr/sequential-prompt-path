
-- ====================================
-- UNPRO Programmatic SEO Engine Tables
-- ====================================

-- 1) Main SEO local pages table (extended schema for programmatic generation)
CREATE TABLE public.seo_local_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  cluster text,
  service_category text,
  problem text NOT NULL,
  slug text UNIQUE NOT NULL,
  meta_title text,
  meta_description text,
  h1 text,
  intro text,
  diagnostic text,
  causes text,
  urgency text,
  solution text,
  cost_range text,
  timing text,
  faq jsonb DEFAULT '[]'::jsonb,
  related_slugs jsonb DEFAULT '[]'::jsonb,
  schema_json_ld jsonb,
  seo_score integer DEFAULT 0,
  intent_score integer DEFAULT 0,
  conversion_score integer DEFAULT 0,
  hero_image_prompt text,
  published boolean DEFAULT false,
  batch_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.seo_local_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "public_read_published_local_seo" ON public.seo_local_pages
  FOR SELECT TO anon USING (published = true);
CREATE POLICY "auth_read_published_local_seo" ON public.seo_local_pages
  FOR SELECT TO authenticated USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_manage_local_seo" ON public.seo_local_pages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_seo_local_pages_slug ON public.seo_local_pages(slug);
CREATE INDEX idx_seo_local_pages_city ON public.seo_local_pages(city);
CREATE INDEX idx_seo_local_pages_category ON public.seo_local_pages(service_category);
CREATE INDEX idx_seo_local_pages_published ON public.seo_local_pages(published) WHERE published = true;

CREATE TRIGGER update_seo_local_pages_updated_at
  BEFORE UPDATE ON public.seo_local_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Internal links v2 for local SEO pages
CREATE TABLE public.seo_local_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_slug text NOT NULL,
  to_slug text NOT NULL,
  anchor_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.seo_local_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_local_links" ON public.seo_local_links
  FOR SELECT TO anon USING (true);
CREATE POLICY "auth_read_local_links" ON public.seo_local_links
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_local_links" ON public.seo_local_links
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_seo_local_links_from ON public.seo_local_links(from_slug);
CREATE INDEX idx_seo_local_links_to ON public.seo_local_links(to_slug);

-- 3) Generation logs
CREATE TABLE public.seo_local_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name text,
  city text,
  total_pages integer DEFAULT 0,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.seo_local_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_gen_logs" ON public.seo_local_generation_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Admin queue for missing matches and alerts
CREATE TABLE public.seo_admin_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  city text,
  slug text,
  payload jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.seo_admin_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_seo_queue" ON public.seo_admin_queue
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
