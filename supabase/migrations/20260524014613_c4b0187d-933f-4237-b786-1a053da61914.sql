
-- ============================================================
-- PAINTING CALCULATOR — schema
-- ============================================================

-- 1) Estimates
CREATE TABLE IF NOT EXISTS public.painting_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_session_id text,
  project_type text NOT NULL,
  room_count integer,
  surface_sqft numeric,
  ceiling_height_ft numeric,
  wall_condition text,
  paint_quality text DEFAULT 'standard',
  coats integer DEFAULT 2,
  current_color text,
  new_color text,
  includes_ceilings boolean DEFAULT false,
  includes_trim boolean DEFAULT false,
  includes_doors boolean DEFAULT false,
  urgency text DEFAULT 'flexible',
  occupied_home boolean DEFAULT true,
  city_slug text,
  address_line text,
  postal_code text,
  estimated_paint_cost numeric,
  estimated_labour_cost numeric,
  estimated_prep_cost numeric,
  estimated_total_min numeric,
  estimated_total_max numeric,
  confidence_level text DEFAULT 'medium',
  status text NOT NULL DEFAULT 'draft',
  ai_notes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_painting_estimates_user ON public.painting_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_painting_estimates_city ON public.painting_estimates(city_slug);
CREATE INDEX IF NOT EXISTS idx_painting_estimates_status ON public.painting_estimates(status);
CREATE INDEX IF NOT EXISTS idx_painting_estimates_created ON public.painting_estimates(created_at DESC);

ALTER TABLE public.painting_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their estimates"
  ON public.painting_estimates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create draft estimate"
  ON public.painting_estimates FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL AND status = 'draft')
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Owners can update their estimates"
  ON public.painting_estimates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can delete their estimates"
  ON public.painting_estimates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 2) Photos
CREATE TABLE IF NOT EXISTS public.painting_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid REFERENCES public.painting_estimates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_session_id text,
  image_url text NOT NULL,
  storage_path text,
  ai_notes jsonb DEFAULT '{}'::jsonb,
  detected_surface_sqft numeric,
  detected_condition text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_painting_photos_estimate ON public.painting_photos(estimate_id);
CREATE INDEX IF NOT EXISTS idx_painting_photos_user ON public.painting_photos(user_id);

ALTER TABLE public.painting_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their photos"
  ON public.painting_photos FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert photo for draft estimate"
  ON public.painting_photos FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Owners can delete their photos"
  ON public.painting_photos FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 3) City pricing grid
CREATE TABLE IF NOT EXISTS public.painting_city_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL UNIQUE,
  city_name text NOT NULL,
  service_type text NOT NULL DEFAULT 'interior',
  min_rate_sqft numeric NOT NULL,
  max_rate_sqft numeric NOT NULL,
  prep_multiplier numeric NOT NULL DEFAULT 1.0,
  urgency_multiplier numeric NOT NULL DEFAULT 1.25,
  labour_modifier numeric NOT NULL DEFAULT 1.0,
  paint_quality_base_cost numeric NOT NULL DEFAULT 55,
  notes_fr text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.painting_city_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read pricing"
  ON public.painting_city_pricing FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage pricing"
  ON public.painting_city_pricing FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4) Trigger to bump updated_at
CREATE OR REPLACE FUNCTION public.painting_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_painting_estimates_updated
  BEFORE UPDATE ON public.painting_estimates
  FOR EACH ROW EXECUTE FUNCTION public.painting_touch_updated_at();

CREATE TRIGGER trg_painting_pricing_updated
  BEFORE UPDATE ON public.painting_city_pricing
  FOR EACH ROW EXECUTE FUNCTION public.painting_touch_updated_at();

-- 5) Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('painting-photos', 'painting-photos', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies: owners (or guest sessions) can upload to their folder; owners read their own files.
CREATE POLICY "Public can upload painting photos to guest folder"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'painting-photos'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR (auth.uid() IS NULL AND (storage.foldername(name))[1] = 'guest')
    )
  );

CREATE POLICY "Owners can read their painting photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'painting-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Public can read guest painting photos"
  ON storage.objects FOR SELECT
  TO anon
  USING (
    bucket_id = 'painting-photos'
    AND (storage.foldername(name))[1] = 'guest'
  );

CREATE POLICY "Owners can delete their painting photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'painting-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role))
  );

-- 6) Seed pricing for 7 cities
INSERT INTO public.painting_city_pricing
  (city_slug, city_name, service_type, min_rate_sqft, max_rate_sqft, prep_multiplier, urgency_multiplier, labour_modifier, paint_quality_base_cost, notes_fr)
VALUES
  ('montreal',   'Montréal',   'interior', 3.50, 6.50, 1.15, 1.30, 1.10, 60, 'Plex, condos, murs anciens (Plateau, Rosemont, NDG).'),
  ('laval',      'Laval',      'interior', 3.25, 5.75, 1.05, 1.25, 1.00, 55, 'Maisons unifamiliales, construction récente (Sainte-Dorothée, Chomedey, Vimont).'),
  ('terrebonne', 'Terrebonne', 'interior', 3.10, 5.50, 1.05, 1.20, 0.98, 55, 'Maisons familiales, humidité Lanaudière, banlieues récentes.'),
  ('longueuil',  'Longueuil',  'interior', 3.20, 5.75, 1.08, 1.25, 1.00, 55, 'Mixte plex et bungalows, Vieux-Longueuil et Saint-Hubert.'),
  ('quebec',     'Québec',     'interior', 3.15, 5.85, 1.10, 1.25, 1.02, 55, 'Cachet patrimonial, plâtre Saint-Sauveur/Limoilou, condos Sainte-Foy.'),
  ('brossard',   'Brossard',   'interior', 3.40, 6.00, 1.05, 1.25, 1.05, 58, 'Maisons récentes, condos Solar Uniquartier, finitions haut de gamme.'),
  ('blainville', 'Blainville', 'interior', 3.30, 5.85, 1.05, 1.20, 1.00, 57, 'Maisons unifamiliales récentes, secteur Fontainebleau/Domaine.')
ON CONFLICT (city_slug) DO UPDATE SET
  min_rate_sqft = EXCLUDED.min_rate_sqft,
  max_rate_sqft = EXCLUDED.max_rate_sqft,
  prep_multiplier = EXCLUDED.prep_multiplier,
  urgency_multiplier = EXCLUDED.urgency_multiplier,
  labour_modifier = EXCLUDED.labour_modifier,
  paint_quality_base_cost = EXCLUDED.paint_quality_base_cost,
  notes_fr = EXCLUDED.notes_fr,
  updated_at = now();
