
-- Service Categories table
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  parent_id uuid REFERENCES public.service_categories(id),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active service categories"
  ON public.service_categories FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage service categories"
  ON public.service_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Cities table
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  province text NOT NULL,
  province_slug text NOT NULL,
  latitude numeric,
  longitude numeric,
  population integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cities"
  ON public.cities FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage cities"
  ON public.cities FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Projects table (hub between property, contractor, quotes)
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.service_categories(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  budget_min numeric,
  budget_max numeric,
  timeline text,
  urgency text DEFAULT 'normal',
  city_id uuid REFERENCES public.cities(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects"
  ON public.projects FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors can view projects with their quotes"
  ON public.projects FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.property_id = projects.property_id
    AND EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = q.contractor_id AND c.user_id = auth.uid())
  ));

-- Add project_id to quotes for direct relationship
ALTER TABLE public.quotes ADD COLUMN project_id uuid REFERENCES public.projects(id);

-- Add updated_at trigger to projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEO pages table for programmatic content tracking
CREATE TABLE public.seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text NOT NULL, -- 'service_location', 'problem_location', 'guide'
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  meta_description text,
  city_id uuid REFERENCES public.cities(id),
  category_id uuid REFERENCES public.service_categories(id),
  content_data jsonb DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published seo pages"
  ON public.seo_pages FOR SELECT
  TO public
  USING (is_published = true);

CREATE POLICY "Admins can manage seo pages"
  ON public.seo_pages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_property_id ON public.projects(property_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_cities_province_slug ON public.cities(province_slug);
CREATE INDEX idx_service_categories_slug ON public.service_categories(slug);
CREATE INDEX idx_seo_pages_page_type ON public.seo_pages(page_type);
CREATE INDEX idx_quotes_project_id ON public.quotes(project_id);
