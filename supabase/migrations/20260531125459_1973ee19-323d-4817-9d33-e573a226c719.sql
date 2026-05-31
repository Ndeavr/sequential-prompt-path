
-- ============================================================
-- Signature Partners: data layer
-- ============================================================

CREATE TABLE IF NOT EXISTS public.signature_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  legal_name text,
  display_name text NOT NULL,
  tagline text,
  source_url text,
  phone text,
  email text,
  address text,
  brand jsonb DEFAULT '{}'::jsonb,
  services jsonb DEFAULT '[]'::jsonb,
  coverage jsonb DEFAULT '[]'::jsonb,
  certifications jsonb DEFAULT '[]'::jsonb,
  media jsonb DEFAULT '{}'::jsonb,
  reviews_summary jsonb DEFAULT '{}'::jsonb,
  scraped_data jsonb DEFAULT '{}'::jsonb,
  enriched_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  tier text NOT NULL DEFAULT 'signature',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.signature_partners TO anon;
GRANT SELECT ON public.signature_partners TO authenticated;
GRANT ALL ON public.signature_partners TO service_role;

ALTER TABLE public.signature_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active signature partners are public"
  ON public.signature_partners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage signature partners"
  ON public.signature_partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================

CREATE TABLE IF NOT EXISTS public.partner_calendar_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.signature_partners(id) ON DELETE CASCADE,
  date date NOT NULL,
  slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'manual',
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, date)
);

CREATE INDEX IF NOT EXISTS idx_partner_calendar_partner_date
  ON public.partner_calendar_availability (partner_id, date);

GRANT SELECT ON public.partner_calendar_availability TO anon;
GRANT SELECT ON public.partner_calendar_availability TO authenticated;
GRANT ALL ON public.partner_calendar_availability TO service_role;

ALTER TABLE public.partner_calendar_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calendar slots are public"
  ON public.partner_calendar_availability FOR SELECT
  USING (true);

CREATE POLICY "Admins manage calendar"
  ON public.partner_calendar_availability FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================

CREATE TABLE IF NOT EXISTS public.partner_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.signature_partners(id) ON DELETE CASCADE,
  service_type text,
  postal_code text,
  property_type text,
  scheduled_at timestamptz,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  user_id uuid,
  source text DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_bookings_partner
  ON public.partner_bookings (partner_id, created_at DESC);

GRANT INSERT ON public.partner_bookings TO anon;
GRANT INSERT, SELECT ON public.partner_bookings TO authenticated;
GRANT ALL ON public.partner_bookings TO service_role;

ALTER TABLE public.partner_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a booking request"
  ON public.partner_bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read their own bookings"
  ON public.partner_bookings FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins read all bookings"
  ON public.partner_bookings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage bookings"
  ON public.partner_bookings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete bookings"
  ON public.partner_bookings FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- updated_at triggers
-- ============================================================

CREATE TRIGGER trg_signature_partners_updated
  BEFORE UPDATE ON public.signature_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_partner_bookings_updated
  BEFORE UPDATE ON public.partner_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Seed: Isolation Solution Royal (placeholder until first scrape)
-- ============================================================

INSERT INTO public.signature_partners (
  slug, legal_name, display_name, tagline, source_url,
  services, coverage, certifications, tier, is_active
) VALUES (
  'isolation-solution-royal',
  'Isolation Solution Royal',
  'Isolation Solution Royal',
  'Spécialistes de l''isolation résidentielle et commerciale',
  'https://isroyal.ca',
  '[
    {"name":"Uréthane giclé","slug":"urethane","description":"Mousse polyuréthane haute densité pour murs, toits et fondations."},
    {"name":"Cellulose soufflée","slug":"cellulose","description":"Isolation écologique à haute performance thermique pour entretoits."},
    {"name":"Fibre de verre","slug":"fibre-verre","description":"Isolation traditionnelle pour murs et combles."},
    {"name":"Insonorisation","slug":"insonorisation","description":"Solutions acoustiques pour résidentiel et commercial."}
  ]'::jsonb,
  '["Laurentides","Lanaudière","Laval","Montréal","Rive-Nord"]'::jsonb,
  '[
    {"label":"Licence RBQ","verified":true},
    {"label":"APCHQ","verified":true},
    {"label":"Écohabitation","verified":false}
  ]'::jsonb,
  'signature',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Seed 14 days of mock availability slots
INSERT INTO public.partner_calendar_availability (partner_id, date, slots, source)
SELECT
  p.id,
  (CURRENT_DATE + i)::date,
  '["09:00","11:00","13:00","15:00"]'::jsonb,
  'manual'
FROM public.signature_partners p,
     generate_series(1, 14) AS i
WHERE p.slug = 'isolation-solution-royal'
ON CONFLICT (partner_id, date) DO NOTHING;
