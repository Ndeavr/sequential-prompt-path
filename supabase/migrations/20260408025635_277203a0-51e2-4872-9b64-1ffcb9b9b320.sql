
-- Condo waitlist leads
CREATE TABLE public.condo_waitlist_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  organization_name TEXT,
  role_type TEXT DEFAULT 'member',
  building_size_range TEXT,
  city TEXT,
  interest_type TEXT DEFAULT 'waitlist',
  lead_source TEXT DEFAULT 'landing',
  campaign_source TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.condo_waitlist_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit waitlist" ON public.condo_waitlist_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view waitlist" ON public.condo_waitlist_leads FOR SELECT USING (true);

-- Condo lead magnets
CREATE TABLE public.condo_lead_magnets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  file_url TEXT,
  language_code TEXT NOT NULL DEFAULT 'fr',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.condo_lead_magnets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active magnets" ON public.condo_lead_magnets FOR SELECT USING (is_active = true);

-- Condo page FAQs
CREATE TABLE public.condo_page_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'fr',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.condo_page_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active faqs" ON public.condo_page_faqs FOR SELECT USING (is_active = true);

-- Condo SEO pages
CREATE TABLE public.condo_seo_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_tag TEXT NOT NULL,
  meta_description TEXT,
  h1_title TEXT NOT NULL,
  intro_text TEXT,
  body_content TEXT,
  schema_payload JSONB,
  language_code TEXT NOT NULL DEFAULT 'fr',
  canonical_url TEXT,
  publish_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.condo_seo_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published pages" ON public.condo_seo_pages FOR SELECT USING (publish_status = 'published');

-- Indexes
CREATE INDEX idx_condo_waitlist_email ON public.condo_waitlist_leads(email);
CREATE INDEX idx_condo_waitlist_status ON public.condo_waitlist_leads(status);
CREATE INDEX idx_condo_faqs_page ON public.condo_page_faqs(page_key);
CREATE INDEX idx_condo_seo_slug ON public.condo_seo_pages(slug);
