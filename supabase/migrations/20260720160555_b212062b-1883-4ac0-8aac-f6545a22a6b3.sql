
-- 1. Align EN brand phonetic lock to "Hun-pro"
UPDATE public.alex_brand_phonetic_lock
SET speech_text = 'Hun-pro', updated_at = now()
WHERE brand_key = 'unpro' AND language_code = 'en';

-- 2. Seed canonical UNPRO rules in the pronunciation rules table (safe insert)
INSERT INTO public.alex_pronunciation_rules (language_code, source_text, normalized_text, phonetic_hint, priority, active)
SELECT 'fr-CA', 'UNPRO', 'Un Pro', 'un pro', 100, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.alex_pronunciation_rules
  WHERE source_text = 'UNPRO' AND language_code = 'fr-CA'
);

INSERT INTO public.alex_pronunciation_rules (language_code, source_text, normalized_text, phonetic_hint, priority, active)
SELECT 'en-CA', 'UNPRO', 'Hun-pro', 'Hun-pro', 100, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.alex_pronunciation_rules
  WHERE source_text = 'UNPRO' AND language_code = 'en-CA'
);

-- 3. Compatibility view for external callers / video generators
CREATE OR REPLACE VIEW public.brand_pronunciations
WITH (security_invoker = true)
AS
SELECT
  brand_key AS brand,
  language_code AS language,
  UPPER(brand_key) AS display_text,
  speech_text,
  NULL::text AS phonetic,
  notes,
  is_active AS enabled,
  updated_at
FROM public.alex_brand_phonetic_lock
WHERE context_type = 'global';

GRANT SELECT ON public.brand_pronunciations TO anon, authenticated, service_role;
