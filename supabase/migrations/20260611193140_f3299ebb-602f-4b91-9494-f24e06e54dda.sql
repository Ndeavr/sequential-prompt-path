
CREATE TABLE IF NOT EXISTS public.founder_score_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  website text,
  city text,
  phone text,
  email text NOT NULL,
  trade text,
  score_visibility int,
  score_trust int,
  score_authority int,
  score_profile int,
  score_growth int,
  opportunities jsonb DEFAULT '[]'::jsonb,
  source text DEFAULT 'pro-score',
  status text NOT NULL DEFAULT 'lead',
  stripe_session_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founder_score_prospects_email_idx ON public.founder_score_prospects (email);
CREATE INDEX IF NOT EXISTS founder_score_prospects_status_idx ON public.founder_score_prospects (status);
CREATE INDEX IF NOT EXISTS founder_score_prospects_created_idx ON public.founder_score_prospects (created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.founder_score_prospects TO authenticated;
GRANT ALL ON public.founder_score_prospects TO service_role;

ALTER TABLE public.founder_score_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_score_prospects_admin_read"
  ON public.founder_score_prospects FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "founder_score_prospects_admin_update"
  ON public.founder_score_prospects FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.founder_plans (slug, name, price, value_total, duration_years, max_spots, spots_remaining, status, features)
VALUES (
  'fondateur-149',
  'Fondateur UNPRO',
  14900,
  179900,
  1,
  25,
  25,
  'open',
  '[
    {"key":"profil_ia","label":"Profil IA optimisé"},
    {"key":"recos","label":"Recommandations propriétaires"},
    {"key":"presence","label":"Présence UNPRO"},
    {"key":"alex","label":"Accès Alex"},
    {"key":"rdv","label":"Jusqu''à 3 rendez-vous exclusifs"},
    {"key":"exclusivite","label":"Aucun lead partagé"},
    {"key":"flex","label":"Annulation en tout temps"}
  ]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
