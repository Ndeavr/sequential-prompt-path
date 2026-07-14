
-- 1. lead_funnel_sessions
CREATE TABLE IF NOT EXISTS public.lead_funnel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NULL,
  session_id TEXT NOT NULL,
  ip_hash TEXT NULL,
  user_agent TEXT NULL,
  device_type TEXT NULL,
  source TEXT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_on_page INTEGER NOT NULL DEFAULT 0,
  scroll_depth INTEGER NOT NULL DEFAULT 0,
  cta_clicked BOOLEAN NOT NULL DEFAULT false,
  cta_clicked_at TIMESTAMPTZ NULL,
  alex_started BOOLEAN NOT NULL DEFAULT false,
  alex_started_at TIMESTAMPTZ NULL,
  signup_started BOOLEAN NOT NULL DEFAULT false,
  signup_started_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lfs_session ON public.lead_funnel_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_lfs_lead ON public.lead_funnel_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lfs_opened ON public.lead_funnel_sessions(opened_at DESC);

GRANT SELECT ON public.lead_funnel_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lead_funnel_sessions TO anon;
GRANT ALL ON public.lead_funnel_sessions TO service_role;

ALTER TABLE public.lead_funnel_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert their landing session"
  ON public.lead_funnel_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own session"
  ON public.lead_funnel_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can read all sessions"
  ON public.lead_funnel_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_lfs_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_lfs_updated_at ON public.lead_funnel_sessions;
CREATE TRIGGER trg_lfs_updated_at BEFORE UPDATE ON public.lead_funnel_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_lfs_updated_at();

-- 2. sms_templates: seed A/B variants (audience_type='funnel_variant')
INSERT INTO public.sms_templates (template_key, template_name, body_template, audience_type, is_active)
VALUES
  ('funnel_variant_A', 'Funnel Variant A', 'Bonjour {company}, des propriétaires cherchent actuellement un entrepreneur en {category} dans votre secteur. Nous avons préparé votre profil. Activez 7 jours pour 1$ : {link}', 'funnel_variant', true),
  ('funnel_variant_B', 'Funnel Variant B', 'Bonjour {company}, votre entreprise a été identifiée comme candidate pour des demandes en {category}. Consultez votre profil prérempli : {link} — Activation 7 jours : 1$', 'funnel_variant', true)
ON CONFLICT (template_key) DO NOTHING;
