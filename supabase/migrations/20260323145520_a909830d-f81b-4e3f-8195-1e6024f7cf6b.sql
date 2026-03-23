
-- Menu profiles (e.g. homeowner, service_business, property_manager, partner)
CREATE TABLE IF NOT EXISTS public.menu_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon_name text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Menu sections within a profile
CREATE TABLE IF NOT EXISTS public.menu_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_slug text NOT NULL REFERENCES public.menu_profiles(slug) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  icon_name text,
  sort_order int DEFAULT 0,
  visibility_state text DEFAULT 'standard',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_slug, slug)
);

-- Menu items within a section
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.menu_sections(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  item_type text DEFAULT 'service',
  icon_name text,
  sort_order int DEFAULT 0,
  visibility_state text DEFAULT 'standard',
  is_popular boolean DEFAULT false,
  is_seasonal boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seasonal rules per item
CREATE TABLE IF NOT EXISTS public.menu_seasonal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  region_slug text DEFAULT 'quebec',
  active_months int[] DEFAULT '{1,2,3,4,5,6,7,8,9,10,11,12}',
  upcoming_months int[] DEFAULT '{}',
  off_season_behavior text DEFAULT 'collapsed',
  priority_weight int DEFAULT 50,
  created_at timestamptz DEFAULT now()
);

-- Visibility rules per profile
CREATE TABLE IF NOT EXISTS public.menu_visibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_slug text NOT NULL REFERENCES public.menu_profiles(slug) ON DELETE CASCADE,
  max_visible_sections int DEFAULT 7,
  max_visible_items_per_section int DEFAULT 10,
  enable_progressive_reveal boolean DEFAULT true,
  show_popular_now boolean DEFAULT true,
  show_upcoming_soon boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_sections_profile ON public.menu_sections(profile_slug);
CREATE INDEX IF NOT EXISTS idx_menu_items_section ON public.menu_items(section_id);
CREATE INDEX IF NOT EXISTS idx_menu_seasonal_item ON public.menu_seasonal_rules(item_id);

-- Enable RLS but allow public read
ALTER TABLE public.menu_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_seasonal_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_visibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read menu_profiles" ON public.menu_profiles FOR SELECT USING (true);
CREATE POLICY "Public read menu_sections" ON public.menu_sections FOR SELECT USING (true);
CREATE POLICY "Public read menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Public read menu_seasonal_rules" ON public.menu_seasonal_rules FOR SELECT USING (true);
CREATE POLICY "Public read menu_visibility_rules" ON public.menu_visibility_rules FOR SELECT USING (true);

CREATE POLICY "Admin manage menu_profiles" ON public.menu_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage menu_sections" ON public.menu_sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage menu_items" ON public.menu_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage menu_seasonal_rules" ON public.menu_seasonal_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage menu_visibility_rules" ON public.menu_visibility_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
