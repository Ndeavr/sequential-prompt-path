
-- Reputation Engine V2: entity-locked snapshots + profile content cache

CREATE TABLE public.contractor_reputation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  contractor_id uuid,
  scan_date timestamptz NOT NULL DEFAULT now(),
  next_scan_date timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  source_count integer NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  average_rating numeric(3,2),
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'fresh',
  last_refresh_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_reputation_snapshots TO anon, authenticated;
GRANT ALL ON public.contractor_reputation_snapshots TO service_role;
ALTER TABLE public.contractor_reputation_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reputation_snapshots_public_read" ON public.contractor_reputation_snapshots FOR SELECT USING (true);
CREATE POLICY "reputation_snapshots_admin_write" ON public.contractor_reputation_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_reputation_snapshots_slug ON public.contractor_reputation_snapshots(slug);
CREATE INDEX idx_reputation_snapshots_next_scan ON public.contractor_reputation_snapshots(next_scan_date);

CREATE TABLE public.contractor_profile_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  contractor_id uuid,
  company_description_fr text,
  company_description_en text,
  services_fr jsonb,
  services_en jsonb,
  specialties_fr jsonb,
  specialties_en jsonb,
  faq_fr jsonb,
  faq_en jsonb,
  tagline_fr text,
  tagline_en text,
  trust_summary_fr text,
  trust_summary_en text,
  locked_fr boolean NOT NULL DEFAULT false,
  locked_en boolean NOT NULL DEFAULT false,
  last_ai_generation_date timestamptz,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_profile_content TO anon, authenticated;
GRANT ALL ON public.contractor_profile_content TO service_role;
ALTER TABLE public.contractor_profile_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_content_public_read" ON public.contractor_profile_content FOR SELECT USING (true);
CREATE POLICY "profile_content_admin_write" ON public.contractor_profile_content FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_profile_content_slug ON public.contractor_profile_content(slug);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.tg_reputation_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_reputation_snapshots_updated_at BEFORE UPDATE ON public.contractor_reputation_snapshots FOR EACH ROW EXECUTE FUNCTION public.tg_reputation_updated_at();
CREATE TRIGGER trg_profile_content_updated_at BEFORE UPDATE ON public.contractor_profile_content FOR EACH ROW EXECUTE FUNCTION public.tg_reputation_updated_at();

-- Seed ISR profile content with hand-written FR copy, locked
INSERT INTO public.contractor_profile_content (
  slug, company_description_fr, tagline_fr, services_fr, locked_fr, locked_en, last_ai_generation_date
) VALUES (
  'isolation-solution-royal',
  'Isolation Solution Royal est un spécialiste reconnu de l''entretoit dans la grande région de Laval et Montréal. L''entreprise intervient sur l''isolation, la ventilation, la décontamination, la vermiculite et l''étanchéité — du diagnostic à l''exécution.',
  'Spécialiste de l''entretoit',
  '["Isolation d''entretoit","Décontamination moisissure","Étanchéité / calfeutrage","Ventilation","Déblocage des soffites","Trappes d''accès","Tuyaux de sécheuse","Vermiculite","Animaux nuisibles"]'::jsonb,
  true,
  true,
  now()
);

-- Seed ISR reputation snapshot (empty sources, so no unverified sources render until real refresh)
INSERT INTO public.contractor_reputation_snapshots (slug, scan_date, next_scan_date, sources, status)
VALUES ('isolation-solution-royal', now(), now() + interval '30 days', '[]'::jsonb, 'fresh');
