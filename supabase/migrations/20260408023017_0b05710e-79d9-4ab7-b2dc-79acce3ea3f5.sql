
-- Brand Phonetic Lock rules
CREATE TABLE public.alex_brand_phonetic_lock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_key TEXT NOT NULL DEFAULT 'unpro',
  language_code TEXT NOT NULL DEFAULT 'fr',
  display_text TEXT NOT NULL DEFAULT 'UNPRO',
  speech_text TEXT NOT NULL,
  phonetic_hint TEXT,
  voice_engine TEXT DEFAULT 'default',
  context_type TEXT NOT NULL DEFAULT 'global',
  is_forced BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phonetic events log
CREATE TABLE public.alex_phonetic_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_key TEXT NOT NULL DEFAULT 'unpro',
  language_code TEXT NOT NULL DEFAULT 'fr',
  original_text TEXT NOT NULL,
  processed_text TEXT NOT NULL,
  engine TEXT,
  rule_id UUID REFERENCES public.alex_brand_phonetic_lock(id),
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.alex_brand_phonetic_lock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_phonetic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read phonetic lock rules" ON public.alex_brand_phonetic_lock FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage phonetic lock" ON public.alex_brand_phonetic_lock FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read phonetic events" ON public.alex_phonetic_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert phonetic events" ON public.alex_phonetic_events FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_phonetic_lock_brand_lang ON public.alex_brand_phonetic_lock(brand_key, language_code, is_active);
CREATE INDEX idx_phonetic_events_brand ON public.alex_phonetic_events(brand_key, created_at DESC);

-- Seed default rules
INSERT INTO public.alex_brand_phonetic_lock (brand_key, language_code, display_text, speech_text, phonetic_hint, context_type, is_forced, priority) VALUES
  ('unpro', 'fr', 'UNPRO', 'un pro', 'œ̃ pʁo', 'global', true, 100),
  ('unpro', 'en', 'UNPRO', 'eun pro', 'ʌn proʊ', 'global', true, 100),
  ('unpro', 'fr', 'UNPRO', 'un pro', 'œ̃ pʁo', 'sentence_start', true, 90),
  ('unpro', 'en', 'UNPRO', 'eun pro', 'ʌn proʊ', 'sentence_start', true, 90);
