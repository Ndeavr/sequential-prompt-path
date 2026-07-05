
-- =========================================================
-- 1. contractor_ai_score
-- =========================================================
CREATE TABLE IF NOT EXISTS public.contractor_ai_score (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NULL,
  domain TEXT NULL,
  business_name TEXT NULL,
  overall_score INT NOT NULL DEFAULT 0,
  visibility_score INT NOT NULL DEFAULT 0,
  trust_score INT NOT NULL DEFAULT 0,
  review_score INT NOT NULL DEFAULT 0,
  compliance_score INT NOT NULL DEFAULT 0,
  proof_score INT NOT NULL DEFAULT 0,
  activity_score INT NOT NULL DEFAULT 0,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contractor_ai_score_domain ON public.contractor_ai_score(domain);
CREATE INDEX IF NOT EXISTS idx_contractor_ai_score_contractor ON public.contractor_ai_score(contractor_id);

GRANT SELECT ON public.contractor_ai_score TO anon, authenticated;
GRANT ALL ON public.contractor_ai_score TO service_role;
ALTER TABLE public.contractor_ai_score ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_score_public_read" ON public.contractor_ai_score FOR SELECT USING (true);

-- =========================================================
-- 2. contractor_market_opportunity
-- =========================================================
CREATE TABLE IF NOT EXISTS public.contractor_market_opportunity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  waiting_homeowners INT NOT NULL DEFAULT 0,
  estimated_revenue_cents BIGINT NOT NULL DEFAULT 0,
  estimated_ltv_cents BIGINT NOT NULL DEFAULT 0,
  pressure_score INT NOT NULL DEFAULT 0,
  competitors_ahead INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'seed',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city, category)
);
CREATE INDEX IF NOT EXISTS idx_market_opp_city_cat ON public.contractor_market_opportunity(city, category);

GRANT SELECT ON public.contractor_market_opportunity TO anon, authenticated;
GRANT ALL ON public.contractor_market_opportunity TO service_role;
ALTER TABLE public.contractor_market_opportunity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market_opp_public_read" ON public.contractor_market_opportunity FOR SELECT USING (true);

-- =========================================================
-- 3. ai_recommendation_rank
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ai_recommendation_rank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  contractor_id UUID NULL,
  contractor_name TEXT NOT NULL,
  rank INT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rank_city_cat_rank ON public.ai_recommendation_rank(city, category, rank);

GRANT SELECT ON public.ai_recommendation_rank TO anon, authenticated;
GRANT ALL ON public.ai_recommendation_rank TO service_role;
ALTER TABLE public.ai_recommendation_rank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_rank_public_read" ON public.ai_recommendation_rank FOR SELECT USING (true);

-- =========================================================
-- 4. scan_ia_reports (anonymes, rattachables)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.scan_ia_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  input_value TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'website',
  normalized_url TEXT NULL,
  business_name TEXT NULL,
  city TEXT NULL,
  category TEXT NULL,
  overall_score INT NOT NULL DEFAULT 0,
  sub_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  opportunities JSONB NOT NULL DEFAULT '{}'::jsonb,
  threats JSONB NOT NULL DEFAULT '{}'::jsonb,
  alex_simulation JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_by UUID NULL,
  claimed_at TIMESTAMPTZ NULL,
  activation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scan_reports_token ON public.scan_ia_reports(session_token);
CREATE INDEX IF NOT EXISTS idx_scan_reports_claimed ON public.scan_ia_reports(claimed_by);

GRANT SELECT ON public.scan_ia_reports TO anon, authenticated;
GRANT UPDATE (claimed_by, claimed_at, activation_status) ON public.scan_ia_reports TO authenticated;
GRANT ALL ON public.scan_ia_reports TO service_role;

ALTER TABLE public.scan_ia_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scan_reports_public_read" ON public.scan_ia_reports FOR SELECT USING (true);
CREATE POLICY "scan_reports_claim_own" ON public.scan_ia_reports
  FOR UPDATE TO authenticated
  USING (claimed_by IS NULL OR claimed_by = auth.uid())
  WITH CHECK (claimed_by = auth.uid());

-- =========================================================
-- Trigger updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_scan_ia_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ai_score_updated_at ON public.contractor_ai_score;
CREATE TRIGGER trg_ai_score_updated_at BEFORE UPDATE ON public.contractor_ai_score
  FOR EACH ROW EXECUTE FUNCTION public.tg_scan_ia_updated_at();

DROP TRIGGER IF EXISTS trg_market_opp_updated_at ON public.contractor_market_opportunity;
CREATE TRIGGER trg_market_opp_updated_at BEFORE UPDATE ON public.contractor_market_opportunity
  FOR EACH ROW EXECUTE FUNCTION public.tg_scan_ia_updated_at();

DROP TRIGGER IF EXISTS trg_ai_rank_updated_at ON public.ai_recommendation_rank;
CREATE TRIGGER trg_ai_rank_updated_at BEFORE UPDATE ON public.ai_recommendation_rank
  FOR EACH ROW EXECUTE FUNCTION public.tg_scan_ia_updated_at();

DROP TRIGGER IF EXISTS trg_scan_reports_updated_at ON public.scan_ia_reports;
CREATE TRIGGER trg_scan_reports_updated_at BEFORE UPDATE ON public.scan_ia_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_scan_ia_updated_at();

-- =========================================================
-- Seed déterministe : opportunités marché principales
-- (Isolation, Toiture, Plomberie, Électricité, Rénovation)
-- pour les 10 villes clés QC
-- =========================================================
INSERT INTO public.contractor_market_opportunity
  (city, category, waiting_homeowners, estimated_revenue_cents, estimated_ltv_cents, pressure_score, competitors_ahead, source)
VALUES
  ('Terrebonne',    'Isolation',   9, 4860000, 12000000, 82, 2, 'seed'),
  ('Repentigny',    'Isolation',   6, 3240000,  8000000, 71, 3, 'seed'),
  ('Mascouche',     'Isolation',   4, 2160000,  5000000, 64, 2, 'seed'),
  ('Laval',         'Isolation',  14, 7560000, 18000000, 88, 5, 'seed'),
  ('Montréal',      'Isolation',  22, 11880000,28000000, 91, 8, 'seed'),
  ('Longueuil',     'Isolation',  11, 5940000, 14000000, 79, 4, 'seed'),
  ('Brossard',      'Isolation',   8, 4320000, 10000000, 74, 3, 'seed'),
  ('Blainville',    'Isolation',   5, 2700000,  6500000, 68, 2, 'seed'),
  ('Boisbriand',    'Isolation',   4, 2160000,  5000000, 62, 2, 'seed'),
  ('Saint-Jérôme',  'Isolation',   6, 3240000,  7500000, 70, 3, 'seed'),
  ('Terrebonne',    'Toiture',    12, 9600000, 22000000, 85, 4, 'seed'),
  ('Laval',         'Toiture',    18, 14400000,34000000, 89, 6, 'seed'),
  ('Montréal',      'Toiture',    28, 22400000,52000000, 93, 9, 'seed'),
  ('Terrebonne',    'Plomberie',  15, 4500000, 11000000, 80, 5, 'seed'),
  ('Laval',         'Plomberie',  21, 6300000, 15000000, 86, 7, 'seed'),
  ('Terrebonne',    'Électricité', 8, 3200000,  8500000, 72, 3, 'seed'),
  ('Laval',         'Électricité',13, 5200000, 13000000, 81, 5, 'seed'),
  ('Terrebonne',    'Rénovation', 10,15000000, 35000000, 78, 4, 'seed'),
  ('Montréal',      'Rénovation', 26,39000000, 92000000, 92, 12, 'seed')
ON CONFLICT (city, category) DO UPDATE SET
  waiting_homeowners = EXCLUDED.waiting_homeowners,
  estimated_revenue_cents = EXCLUDED.estimated_revenue_cents,
  updated_at = now();

-- Seed AI rank pour Terrebonne / Isolation
INSERT INTO public.ai_recommendation_rank (city, category, contractor_name, rank, score, reasons)
VALUES
  ('Terrebonne', 'Isolation', 'Isolation Solution Royal', 1, 92, '["profil complet","avis vérifiés","territoire défini","disponibilité confirmée"]'::jsonb),
  ('Terrebonne', 'Isolation', 'Iso-Confort Lanaudière',   2, 78, '["profil complet","RBQ vérifié"]'::jsonb),
  ('Terrebonne', 'Isolation', 'Groupe Isolation Nord',    3, 71, '["présence locale"]'::jsonb),
  ('Laval',      'Isolation', 'Isolation Solution Royal', 1, 90, '["profil complet","avis vérifiés"]'::jsonb),
  ('Montréal',   'Isolation', 'Isolation Métropole',      1, 88, '["profil complet","équipe étendue"]'::jsonb)
ON CONFLICT DO NOTHING;
