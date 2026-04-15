
-- Extend existing prospects table with missing columns
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS prenom TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS domaine TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS url_google TEXT;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS langue_preferee TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS source TEXT;

-- scores_aipp_prospects
CREATE TABLE public.scores_aipp_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  score_visibilite NUMERIC NOT NULL DEFAULT 0,
  score_conversion NUMERIC NOT NULL DEFAULT 0,
  score_confiance NUMERIC NOT NULL DEFAULT 0,
  nombre_avis INT NOT NULL DEFAULT 0,
  revenu_manque_estime NUMERIC DEFAULT 0,
  ecart_conversion NUMERIC DEFAULT 0,
  details_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scores_aipp_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_scores_aipp" ON public.scores_aipp_prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_scores_aipp" ON public.scores_aipp_prospects FOR INSERT TO authenticated WITH CHECK (true);

-- insights_prospects
CREATE TABLE public.insights_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  forces JSONB DEFAULT '[]',
  faiblesses JSONB DEFAULT '[]',
  opportunites JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.insights_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_insights" ON public.insights_prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_insights" ON public.insights_prospects FOR INSERT TO authenticated WITH CHECK (true);

-- sequences_emails
CREATE TABLE public.sequences_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  campagne_id UUID,
  etape INT NOT NULL DEFAULT 1,
  sujet TEXT NOT NULL,
  contenu TEXT NOT NULL,
  langue TEXT NOT NULL DEFAULT 'fr',
  statut TEXT NOT NULL DEFAULT 'brouillon',
  date_envoi TIMESTAMPTZ,
  ouvert BOOLEAN DEFAULT false,
  clique BOOLEAN DEFAULT false,
  repondu BOOLEAN DEFAULT false,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sequences_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_seq_emails" ON public.sequences_emails FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_seq_emails" ON public.sequences_emails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_seq_emails" ON public.sequences_emails FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- evenements_sms
CREATE TABLE public.evenements_sms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  langue TEXT NOT NULL DEFAULT 'fr',
  statut TEXT NOT NULL DEFAULT 'brouillon',
  date_envoi TIMESTAMPTZ,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evenements_sms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_sms" ON public.evenements_sms FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sms" ON public.evenements_sms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sms" ON public.evenements_sms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- audits_screenshots
CREATE TABLE public.audits_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  url_image TEXT,
  annotations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audits_screenshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_screenshots" ON public.audits_screenshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_screenshots" ON public.audits_screenshots FOR INSERT TO authenticated WITH CHECK (true);

-- campagnes_acquisition (using unique name to avoid conflicts)
CREATE TABLE public.campagnes_acquisition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  total_envoyes INT DEFAULT 0,
  total_ouverts INT DEFAULT 0,
  total_clics INT DEFAULT 0,
  total_reponses INT DEFAULT 0,
  taux_ouverture NUMERIC DEFAULT 0,
  taux_clic NUMERIC DEFAULT 0,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campagnes_acquisition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_campagnes" ON public.campagnes_acquisition FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_campagnes" ON public.campagnes_acquisition FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_campagnes" ON public.campagnes_acquisition FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- scores_delivrabilite
CREATE TABLE public.scores_delivrabilite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domaine TEXT NOT NULL,
  score_boite_reception NUMERIC DEFAULT 0,
  risque_spam NUMERIC DEFAULT 0,
  details_json JSONB DEFAULT '{}',
  derniere_verification TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scores_delivrabilite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_delivrabilite" ON public.scores_delivrabilite FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_delivrabilite" ON public.scores_delivrabilite FOR INSERT TO authenticated WITH CHECK (true);

-- FK from sequences_emails to campagnes_acquisition
ALTER TABLE public.sequences_emails ADD CONSTRAINT fk_seq_campagne FOREIGN KEY (campagne_id) REFERENCES public.campagnes_acquisition(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_scores_aipp_prospect ON public.scores_aipp_prospects(prospect_id);
CREATE INDEX idx_sequences_prospect ON public.sequences_emails(prospect_id);
CREATE INDEX idx_sequences_campagne ON public.sequences_emails(campagne_id);
CREATE INDEX idx_prospects_email ON public.prospects(email);
CREATE INDEX idx_prospects_langue ON public.prospects(langue_preferee);
