
-- Add missing columns to alex_voice_pronunciation_rules
ALTER TABLE public.alex_voice_pronunciation_rules
  ADD COLUMN IF NOT EXISTS rule_name TEXT,
  ADD COLUMN IF NOT EXISTS phonetic_override TEXT;

-- Create pronunciation logs table
CREATE TABLE IF NOT EXISTS public.alex_voice_pronunciation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_session_id TEXT,
  original_text TEXT NOT NULL,
  transformed_text TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'fr-CA',
  applied_rules_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_voice_pronunciation_logs ENABLE ROW LEVEL SECURITY;

-- Public insert for voice pipeline (sessions are often anonymous)
CREATE POLICY "Anyone can insert pronunciation logs"
  ON public.alex_voice_pronunciation_logs FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read logs (admin)
CREATE POLICY "Authenticated users can read pronunciation logs"
  ON public.alex_voice_pronunciation_logs FOR SELECT
  TO authenticated USING (true);

-- Ensure public read on pronunciation rules for voice pipeline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alex_voice_pronunciation_rules' AND policyname = 'Anyone can read pronunciation rules'
  ) THEN
    CREATE POLICY "Anyone can read pronunciation rules"
      ON public.alex_voice_pronunciation_rules FOR SELECT USING (true);
  END IF;
END $$;

-- Seed brand pronunciation rules (fr-CA)
INSERT INTO public.alex_voice_pronunciation_rules (rule_name, source_text, replacement_text, phonetic_override, locale, rule_type, priority, is_active, notes) VALUES
  ('UNPRO FR', 'UNPRO', 'un pro', 'eune pro', 'fr-CA', 'brand', 200, true, 'Brand name - must sound natural in QC French'),
  ('UNPRO lowercase FR', 'unpro', 'un pro', 'eune pro', 'fr-CA', 'brand', 199, true, 'Brand name lowercase variant'),
  ('Unpro mixed FR', 'Unpro', 'un pro', 'eune pro', 'fr-CA', 'brand', 198, true, 'Brand name mixed case'),
  ('Alex FR', 'Alex', 'Alix', NULL, 'fr-CA', 'brand', 190, true, 'Alex name - QC pronunciation'),
  ('Passeport Maison FR', 'Passeport Maison', 'pass-por maison', NULL, 'fr-CA', 'product', 180, true, 'Product name'),
  ('Passeport Condo FR', 'Passeport Condo', 'pass-por condo', NULL, 'fr-CA', 'product', 179, true, 'Product name'),
  ('RBQ FR', 'RBQ', 'R.B.Q.', NULL, 'fr-CA', 'technical', 170, true, 'Acronym spacing for TTS'),
  ('CMMTQ FR', 'CMMTQ', 'C.M.M.T.Q.', NULL, 'fr-CA', 'technical', 169, true, 'Acronym spacing'),
  ('CMEQ FR', 'CMEQ', 'C.M.E.Q.', NULL, 'fr-CA', 'technical', 168, true, 'Acronym spacing'),
  ('AIPP FR', 'AIPP', 'A.I.P.P.', NULL, 'fr-CA', 'technical', 167, true, 'Acronym spacing'),
  ('Rive-Sud FR', 'Rive-Sud', 'rive sud', NULL, 'fr-CA', 'correction', 150, true, 'Hyphen removal for natural speech'),
  ('24/7 FR', '24/7', '24 sur 7', NULL, 'fr-CA', 'correction', 140, true, 'Number readability')
ON CONFLICT DO NOTHING;

-- Seed brand pronunciation rules (en-CA)
INSERT INTO public.alex_voice_pronunciation_rules (rule_name, source_text, replacement_text, phonetic_override, locale, rule_type, priority, is_active, notes) VALUES
  ('UNPRO EN', 'UNPRO', 'un-pro', 'Hun-pro', 'en-CA', 'brand', 200, true, 'Brand name English'),
  ('UNPRO lowercase EN', 'unpro', 'un-pro', 'Hun-pro', 'en-CA', 'brand', 199, true, 'Brand lowercase EN'),
  ('Passeport Maison EN', 'Passeport Maison', 'Passport Maison', NULL, 'en-CA', 'product', 180, true, 'Product English adaptation'),
  ('Passeport Condo EN', 'Passeport Condo', 'Passport Condo', NULL, 'en-CA', 'product', 179, true, 'Product English adaptation'),
  ('RBQ EN', 'RBQ', 'R.B.Q.', NULL, 'en-CA', 'technical', 170, true, 'Acronym spacing'),
  ('CMMTQ EN', 'CMMTQ', 'C.M.M.T.Q.', NULL, 'en-CA', 'technical', 169, true, 'Acronym spacing'),
  ('CMEQ EN', 'CMEQ', 'C.M.E.Q.', NULL, 'en-CA', 'technical', 168, true, 'Acronym spacing')
ON CONFLICT DO NOTHING;

-- Index for fast rule lookup by locale
CREATE INDEX IF NOT EXISTS idx_pronunciation_rules_locale_active
  ON public.alex_voice_pronunciation_rules (locale, is_active, priority DESC);

-- Index for log lookup
CREATE INDEX IF NOT EXISTS idx_pronunciation_logs_session
  ON public.alex_voice_pronunciation_logs (voice_session_id, created_at DESC);
