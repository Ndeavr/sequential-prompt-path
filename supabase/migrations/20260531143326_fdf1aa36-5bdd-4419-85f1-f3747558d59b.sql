
-- 1. Google Calendar columns
ALTER TABLE public.partner_bookings
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS google_sync_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS google_sync_error TEXT;

-- 2. Storage bucket for partner media (logos, galleries) — public read
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-media', 'partner-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read on partner-media
DO $$ BEGIN
  CREATE POLICY "Public read partner-media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'partner-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role writes (edge function uses service role anyway, but explicit policy for clarity)
DO $$ BEGIN
  CREATE POLICY "Service role write partner-media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'partner-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Fix Isolation Solution Royal: remove cellulose, set fibre de verre rose
UPDATE public.signature_partners
SET
  tagline = 'Spécialistes en isolation soufflée à la fibre de verre rose, décontamination et ventilation optimale',
  brand = COALESCE(brand, '{}'::jsonb) || jsonb_build_object(
    'material_primary', 'fibre_de_verre_rose',
    'material_label', 'Fibre de verre rose'
  ),
  services = '[
    {"name":"Isolation d''entretoit (R-51 soufflée)","slug":"isolation-entretoit","description":"Fibre de verre rose soufflée haute performance jusqu''à R-51 pour stopper les pertes de chaleur et l''inconfort à l''étage."},
    {"name":"Ventilation d''entretoit (1/300)","slug":"ventilation-entretoit","description":"Correction de la ventilation soffites/évents selon la norme 1/300 pour éliminer condensation et barrages de glace."},
    {"name":"Étanchéité à l''air","slug":"etancheite-air","description":"Scellement des fuites d''air entre la maison et l''entretoit — la cause racine de la majorité des problèmes."},
    {"name":"Décontamination de moisissures","slug":"decontamination-moisissures","description":"Nettoyage et traitement professionnel des entretoits contaminés par la moisissure ou l''humidité."},
    {"name":"Retrait de vermiculite","slug":"retrait-vermiculite","description":"Aspiration sécuritaire de vermiculite (potentiellement amiantée) selon les protocoles CNESST."},
    {"name":"Barrages de glace","slug":"barrages-glace","description":"Diagnostic et correction des causes (isolation + ventilation) qui provoquent les barrages de glace en hiver."}
  ]'::jsonb
WHERE slug = 'isolation-solution-royal';
