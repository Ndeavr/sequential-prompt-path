
ALTER TABLE public.war_prospects
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS tracking_token text,
  ADD COLUMN IF NOT EXISTS landing_views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_landing_view_at timestamptz,
  ADD COLUMN IF NOT EXISTS visibility_score integer,
  ADD COLUMN IF NOT EXISTS trust_score integer,
  ADD COLUMN IF NOT EXISTS conversion_score integer,
  ADD COLUMN IF NOT EXISTS speed_score integer,
  ADD COLUMN IF NOT EXISTS opportunity_score integer,
  ADD COLUMN IF NOT EXISTS estimated_missed_leads_monthly integer;

CREATE OR REPLACE FUNCTION public.unpro_slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
           regexp_replace(
             lower(translate(coalesce(input, ''),
               'àâäáãåçèéêëìíîïñòóôõöøùúûüýÿÀÂÄÁÃÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝŸ',
               'aaaaaaceeeeiiiinooooooouuuuyyaaaaaaceeeeiiiinooooooouuuuyy'
             )),
             '[^a-z0-9]+', '-', 'g'
           ),
           '(^-+|-+$)', '', 'g'
         );
$$;

UPDATE public.war_prospects
SET slug = COALESCE(
  slug,
  NULLIF(public.unpro_slugify(company_name || '-' || city), '')
   || '-' || substr(replace(id::text, '-', ''), 1, 6)
),
tracking_token = COALESCE(
  tracking_token,
  encode(gen_random_bytes(18), 'base64')
)
WHERE slug IS NULL OR tracking_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_war_prospects_slug
  ON public.war_prospects (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_war_prospects_tracking_token
  ON public.war_prospects (tracking_token) WHERE tracking_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.war_prospects_assign_slug_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.unpro_slugify(NEW.company_name || '-' || COALESCE(NEW.city, 'qc'))
                || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;
  IF NEW.tracking_token IS NULL OR NEW.tracking_token = '' THEN
    NEW.tracking_token := encode(gen_random_bytes(18), 'base64');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_war_prospects_slug_token ON public.war_prospects;
CREATE TRIGGER trg_war_prospects_slug_token
  BEFORE INSERT ON public.war_prospects
  FOR EACH ROW EXECUTE FUNCTION public.war_prospects_assign_slug_token();

CREATE TABLE IF NOT EXISTS public.pro_landing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.war_prospects(id) ON DELETE CASCADE,
  slug text,
  tracking_token text,
  user_agent text,
  referrer text,
  alex_started boolean NOT NULL DEFAULT false,
  cta_clicked text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pro_landing_views_prospect ON public.pro_landing_views(prospect_id);
CREATE INDEX IF NOT EXISTS idx_pro_landing_views_created ON public.pro_landing_views(created_at DESC);

ALTER TABLE public.pro_landing_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access pro_landing_views" ON public.pro_landing_views;
CREATE POLICY "Service role full access pro_landing_views"
  ON public.pro_landing_views FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins read pro_landing_views" ON public.pro_landing_views;
CREATE POLICY "Admins read pro_landing_views"
  ON public.pro_landing_views FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.alex_voice_profiles
  (name, gender, language, voice_provider, voice_id_primary, tone_style, is_active, profile_key)
VALUES
  ('Charlotte Premium', 'female', 'fr', 'elevenlabs', 'XB0fDUnXU5powFXDhCwa', 'warm_confident', true, 'nuclear_close_fr'),
  ('Sarah Premium', 'female', 'en', 'elevenlabs', 'EXAVITQu4vr4xnSDxMaL', 'warm_confident', true, 'nuclear_close_en')
ON CONFLICT DO NOTHING;
