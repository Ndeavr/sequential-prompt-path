
DO $$ BEGIN
  CREATE TYPE public.import_run_status AS ENUM ('draft','crawling','enriching','scoring','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.contractor_import_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID,
  user_id UUID,
  domain TEXT,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.import_run_status NOT NULL DEFAULT 'draft',
  current_stage TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.contractor_import_runs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_import_runs TO authenticated;
GRANT ALL ON public.contractor_import_runs TO service_role;

ALTER TABLE public.contractor_import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_runs_read_all" ON public.contractor_import_runs FOR SELECT USING (true);
CREATE POLICY "import_runs_insert_all" ON public.contractor_import_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "import_runs_update_all" ON public.contractor_import_runs FOR UPDATE USING (true);

CREATE INDEX idx_import_runs_contractor ON public.contractor_import_runs(contractor_id);
CREATE INDEX idx_import_runs_status ON public.contractor_import_runs(status);

CREATE TABLE public.contractor_import_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES public.contractor_import_runs(id) ON DELETE CASCADE,
  contractor_id UUID,
  logo_url TEXT,
  favicon_url TEXT,
  hero_image_url TEXT,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  description TEXT,
  rbq_number TEXT,
  neq_number TEXT,
  years_in_business INTEGER,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  before_after JSONB NOT NULL DEFAULT '[]'::jsonb,
  videos JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  service_cities JSONB NOT NULL DEFAULT '[]'::jsonb,
  testimonials JSONB NOT NULL DEFAULT '[]'::jsonb,
  trust_badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  financing_mentioned BOOLEAN NOT NULL DEFAULT false,
  emergency_mentioned BOOLEAN NOT NULL DEFAULT false,
  raw_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.contractor_import_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_import_assets TO authenticated;
GRANT ALL ON public.contractor_import_assets TO service_role;

ALTER TABLE public.contractor_import_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_assets_read_all" ON public.contractor_import_assets FOR SELECT USING (true);
CREATE POLICY "import_assets_write_all" ON public.contractor_import_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "import_assets_update_all" ON public.contractor_import_assets FOR UPDATE USING (true);

CREATE INDEX idx_import_assets_run ON public.contractor_import_assets(run_id);

CREATE TABLE public.contractor_import_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES public.contractor_import_runs(id) ON DELETE CASCADE,
  contractor_id UUID,
  seo_score INTEGER NOT NULL DEFAULT 0,
  trust_score INTEGER NOT NULL DEFAULT 0,
  social_score INTEGER NOT NULL DEFAULT 0,
  conversion_score INTEGER NOT NULL DEFAULT 0,
  completeness_score INTEGER NOT NULL DEFAULT 0,
  aeo_score INTEGER NOT NULL DEFAULT 0,
  overall_score INTEGER NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary TEXT,
  quick_wins JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.contractor_import_scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_import_scores TO authenticated;
GRANT ALL ON public.contractor_import_scores TO service_role;

ALTER TABLE public.contractor_import_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_scores_read_all" ON public.contractor_import_scores FOR SELECT USING (true);
CREATE POLICY "import_scores_write_all" ON public.contractor_import_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "import_scores_update_all" ON public.contractor_import_scores FOR UPDATE USING (true);

CREATE INDEX idx_import_scores_run ON public.contractor_import_scores(run_id);

CREATE TRIGGER trg_import_runs_updated BEFORE UPDATE ON public.contractor_import_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_import_assets_updated BEFORE UPDATE ON public.contractor_import_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_import_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_import_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_import_scores;
