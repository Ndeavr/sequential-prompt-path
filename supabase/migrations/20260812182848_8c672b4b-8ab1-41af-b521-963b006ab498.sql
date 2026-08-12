DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.contractors WHERE slug = 'pavage-alpha-laval';

  IF v_id IS NULL THEN
    INSERT INTO public.contractors (
      user_id, business_name, slug, specialty, description, phone, website,
      city, province, verification_status, admin_verified,
      is_published, is_discoverable, is_accepting_appointments,
      account_status, onboarding_status, activation_status,
      rbq_compliance_status, service_areas
    ) VALUES (
      gen_random_uuid(),
      'Pavage Alpha',
      'pavage-alpha-laval',
      'Pavage et asphalte',
      'Pavage Alpha propose des travaux d''installation, de réparation et d''entretien de surfaces asphaltées pour des projets résidentiels, commerciaux et industriels à Laval, Montréal, sur la Rive-Sud et dans les environs.',
      '514-262-9791',
      'https://www.pavagealpha.ca/',
      'Laval', 'QC',
      'unverified', false,
      true, true, false,
      'active', 'not_started', 'not_ready',
      'not_provided',
      ARRAY['Laval','Montréal','Rive-Sud','Régions environnantes']::text[]
    ) RETURNING id INTO v_id;
  END IF;

  DELETE FROM public.contractor_services WHERE contractor_id = v_id;
  INSERT INTO public.contractor_services (contractor_id, service_name_fr, category, data_source, display_order, is_active, is_primary)
  VALUES
    (v_id, 'Pose d''asphalte',            'installation', 'public_source_declared', 1,  true, true),
    (v_id, 'Nouvelles entrées',           'installation', 'public_source_declared', 2,  true, false),
    (v_id, 'Stationnements',              'installation', 'public_source_declared', 3,  true, false),
    (v_id, 'Pavé uni',                    'installation', 'public_source_declared', 4,  true, false),
    (v_id, 'Murs de soutènement',         'installation', 'public_source_declared', 5,  true, false),
    (v_id, 'Aménagement extérieur',       'installation', 'public_source_declared', 6,  true, false),
    (v_id, 'Resurfaçage',                 'reparation',   'public_source_declared', 7,  true, false),
    (v_id, 'Réparation d''asphalte',      'reparation',   'public_source_declared', 8,  true, false),
    (v_id, 'Réparation de fissures',      'reparation',   'public_source_declared', 9,  true, false),
    (v_id, 'Réparation de nids-de-poule', 'reparation',   'public_source_declared', 10, true, false),
    (v_id, 'Application de scellant',     'reparation',   'public_source_declared', 11, true, false),
    (v_id, 'Surfaces commerciales',       'commercial',   'public_source_declared', 12, true, false),
    (v_id, 'Surfaces industrielles',      'commercial',   'public_source_declared', 13, true, false),
    (v_id, 'Marquage de stationnements',  'commercial',   'public_source_declared', 14, true, false),
    (v_id, 'Entretien de surfaces pavées','commercial',   'public_source_declared', 15, true, false);

  DELETE FROM public.contractor_service_areas WHERE contractor_id = v_id;
  INSERT INTO public.contractor_service_areas (contractor_id, city_name, city_slug, province, is_primary, data_source, validation_status)
  VALUES
    (v_id, 'Laval',                 'laval',                 'QC', true,  'public_source_declared', 'pending'),
    (v_id, 'Montréal',              'montreal',              'QC', false, 'public_source_declared', 'pending'),
    (v_id, 'Rive-Sud',              'rive-sud',              'QC', false, 'public_source_declared', 'pending'),
    (v_id, 'Régions environnantes', 'regions-environnantes', 'QC', false, 'public_source_declared', 'pending');

  DELETE FROM public.contractor_public_pages WHERE slug = 'pavage-alpha-laval';
  INSERT INTO public.contractor_public_pages (
    contractor_id, slug, is_published, published_at, seo_title, seo_description,
    canonical_url, faq, custom_sections, last_crawled_at
  ) VALUES (
    v_id, 'pavage-alpha-laval', true, now(),
    'Pavage Alpha à Laval | Services et profil UNPRO',
    'Découvrez les services déclarés de Pavage Alpha à Laval, les tendances observées dans les commentaires publics et les vérifications à effectuer avant vos travaux de pavage.',
    'https://unpro.ca/entrepreneur/pavage-alpha-laval',
    '[]'::jsonb,
    jsonb_build_object(
      'public_sources', jsonb_build_array(
        jsonb_build_object('label','Site officiel','url','https://www.pavagealpha.ca/'),
        jsonb_build_object('label','Page Facebook','url','https://www.facebook.com/p/Pavage-alpha-100080507905741/'),
        jsonb_build_object('label','Wheree (agrégateur tiers)','url','https://pavage-alpha.wheree.com/'),
        jsonb_build_object('label','Indeed','url','https://emplois.ca.indeed.com/cmp/Pavage-Alpha')
      ),
      'reviewed_on', '2026-08-12',
      'address_note', 'Adresse principale à confirmer par l''entreprise'
    ),
    now()
  );
END $$;

CREATE TABLE IF NOT EXISTS public.contractor_profile_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  contractor_slug text,
  field_key text NOT NULL,
  current_value text,
  requested_value text NOT NULL,
  evidence_url text,
  reporter_name text NOT NULL,
  reporter_contact text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  source text DEFAULT 'contractor_profile',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contractor_profile_corrections TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contractor_profile_corrections TO authenticated;
GRANT ALL ON public.contractor_profile_corrections TO service_role;

ALTER TABLE public.contractor_profile_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a correction"
  ON public.contractor_profile_corrections FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND length(requested_value) BETWEEN 2 AND 2000
    AND length(reporter_name) BETWEEN 2 AND 120
    AND length(reporter_contact) BETWEEN 5 AND 160
  );

CREATE POLICY "Admins can read corrections"
  ON public.contractor_profile_corrections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update corrections"
  ON public.contractor_profile_corrections FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_cpc_contractor ON public.contractor_profile_corrections (contractor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpc_status ON public.contractor_profile_corrections (status, created_at DESC);

CREATE TRIGGER trg_cpc_updated_at
  BEFORE UPDATE ON public.contractor_profile_corrections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();