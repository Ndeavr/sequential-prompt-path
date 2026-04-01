
-- Entrepreneur profiles draft (AIPP draft before activation)
CREATE TABLE public.entrepreneur_profiles_draft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID REFERENCES public.contractor_import_sessions(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  user_id UUID,
  business_name TEXT,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  website_url TEXT,
  city TEXT,
  province TEXT DEFAULT 'QC',
  service_categories JSONB DEFAULT '[]',
  service_subcategories JSONB DEFAULT '[]',
  target_territories JSONB DEFAULT '[]',
  business_description_short TEXT,
  business_description_long TEXT,
  ai_indexing_summary TEXT,
  trust_signals_summary TEXT,
  media_gallery JSONB DEFAULT '[]',
  logo_url TEXT,
  google_rating NUMERIC(2,1),
  google_reviews_count INTEGER DEFAULT 0,
  completeness_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entrepreneur_profiles_draft ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert draft profiles"
  ON public.entrepreneur_profiles_draft FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users see own draft profiles"
  ON public.entrepreneur_profiles_draft FOR SELECT TO anon, authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.is_admin());

CREATE POLICY "Users update own draft profiles"
  ON public.entrepreneur_profiles_draft FOR UPDATE TO anon, authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR public.is_admin());

CREATE TRIGGER set_updated_at_profiles_draft
  BEFORE UPDATE ON public.entrepreneur_profiles_draft
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Entrepreneur assets (logos, photos, business card images)
CREATE TABLE public.entrepreneur_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID REFERENCES public.contractor_import_sessions(id) ON DELETE CASCADE,
  profile_draft_id UUID REFERENCES public.entrepreneur_profiles_draft(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL DEFAULT 'gallery_image',
  storage_path TEXT NOT NULL,
  source_type TEXT DEFAULT 'upload',
  alt_text TEXT,
  ai_caption TEXT,
  is_primary BOOLEAN DEFAULT false,
  quality_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entrepreneur_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert assets"
  ON public.entrepreneur_assets FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can view assets"
  ON public.entrepreneur_assets FOR SELECT TO anon, authenticated USING (true);

-- Entrepreneur profile fields (provenance tracking per field)
CREATE TABLE public.entrepreneur_profile_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_draft_id UUID NOT NULL REFERENCES public.entrepreneur_profiles_draft(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT,
  source_priority INTEGER DEFAULT 0,
  source_type TEXT DEFAULT 'manual',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entrepreneur_profile_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert profile fields"
  ON public.entrepreneur_profile_fields FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can view profile fields"
  ON public.entrepreneur_profile_fields FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can update profile fields"
  ON public.entrepreneur_profile_fields FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Entrepreneur activation events (journal)
CREATE TABLE public.entrepreneur_activation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID REFERENCES public.contractor_import_sessions(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entrepreneur_activation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert activation events"
  ON public.entrepreneur_activation_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users see own activation events"
  ON public.entrepreneur_activation_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
