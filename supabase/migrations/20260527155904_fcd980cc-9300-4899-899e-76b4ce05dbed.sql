-- ───── contractor_assets ─────
CREATE TABLE public.contractor_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo','chantier','equipe','camion','certificat','avant_apres','favicon','og_image','other')),
  source TEXT NOT NULL CHECK (source IN ('website','google','facebook','instagram','upload','unknown')),
  url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  ai_confidence NUMERIC(4,3),
  ai_classification JSONB DEFAULT '{}'::jsonb,
  validated BOOLEAN NOT NULL DEFAULT false,
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','validated','rejected')),
  rejected_reason TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contractor_assets_contractor ON public.contractor_assets(contractor_id);
CREATE INDEX idx_contractor_assets_type ON public.contractor_assets(contractor_id, asset_type);
CREATE INDEX idx_contractor_assets_status ON public.contractor_assets(contractor_id, validation_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_assets TO authenticated;
GRANT ALL ON public.contractor_assets TO service_role;

ALTER TABLE public.contractor_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contractor_assets"
ON public.contractor_assets
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractor owners read their assets"
ON public.contractor_assets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = contractor_assets.contractor_id
      AND c.user_id = auth.uid()
  )
);

CREATE TRIGGER trg_contractor_assets_updated
BEFORE UPDATE ON public.contractor_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───── contractor_scraping_runs ─────
CREATE TABLE public.contractor_scraping_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scraping','classifying','validating','consolidating','scoring','completed','failed')),
  source TEXT,
  assets_detected INTEGER NOT NULL DEFAULT 0,
  assets_validated INTEGER NOT NULL DEFAULT 0,
  assets_rejected INTEGER NOT NULL DEFAULT 0,
  logos_detected INTEGER NOT NULL DEFAULT 0,
  logos_validated INTEGER NOT NULL DEFAULT 0,
  photos_detected INTEGER NOT NULL DEFAULT 0,
  photos_validated INTEGER NOT NULL DEFAULT 0,
  reviews_detected INTEGER NOT NULL DEFAULT 0,
  reviews_validated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scraping_runs_contractor ON public.contractor_scraping_runs(contractor_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_scraping_runs TO authenticated;
GRANT ALL ON public.contractor_scraping_runs TO service_role;

ALTER TABLE public.contractor_scraping_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scraping_runs"
ON public.contractor_scraping_runs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractor owners read their runs"
ON public.contractor_scraping_runs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = contractor_scraping_runs.contractor_id
      AND c.user_id = auth.uid()
  )
);

CREATE TRIGGER trg_scraping_runs_updated
BEFORE UPDATE ON public.contractor_scraping_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();