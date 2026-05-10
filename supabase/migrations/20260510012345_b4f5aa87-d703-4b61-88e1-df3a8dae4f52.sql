-- 1. Mojibake repair function
CREATE OR REPLACE FUNCTION public.repair_mojibake_text(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $func$
DECLARE
  s text := input;
  pairs text[][] := ARRAY[
    ['â€™', E'\u2019'],
    ['â€˜', E'\u2018'],
    ['â€œ', E'\u201C'],
    [E'â€\u009d', E'\u201D'],
    ['â€"', '—'],
    ['â€¢', '•'],
    ['â€¦', '…'],
    ['â‚¬', '€'],
    [E'Â\u00a0', ' '],
    ['Â ', ' '],
    ['Ã©', 'é'], ['Ã¨', 'è'], ['Ãª', 'ê'], ['Ã«', 'ë'],
    ['Ã ', 'à'], ['Ã¢', 'â'], ['Ã¤', 'ä'], ['Ã§', 'ç'],
    ['Ã®', 'î'], ['Ã¯', 'ï'], ['Ã´', 'ô'], ['Ã¶', 'ö'],
    ['Ã¹', 'ù'], ['Ã»', 'û'], ['Ã¼', 'ü'], ['Ã±', 'ñ'],
    ['Ã€', 'À'], ['Ã‰', 'É'], ['Ã‡', 'Ç'],
    ['Ã™', 'Ù'], ['Ãœ', 'Ü'], ['Ãˆ', 'È'],
    ['ÃŠ', 'Ê'], ['Ã‹', 'Ë'], ['Ã‚', 'Â'],
    ['Ã„', 'Ä'], ['Ã‘', 'Ñ'], ['Ã–', 'Ö']
  ];
  i int;
BEGIN
  IF s IS NULL THEN RETURN NULL; END IF;

  IF btrim(s) ~ '^([[:space:]+()\-.\d]{7,})$'
     OR btrim(s) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR btrim(s) ~ '^(https?://|www\.)[^[:space:]]+$'
     OR btrim(s) ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+(/.*)?$'
     OR btrim(s) ~ '^\d{4}-\d{4}-\d{2}$'
     OR btrim(s) ~ '^\d{10}$'
  THEN
    RETURN btrim(s);
  END IF;

  IF s !~ '(Ã|Â|â€)' THEN
    RETURN s;
  END IF;

  FOR i IN 1 .. array_length(pairs, 1) LOOP
    s := replace(s, pairs[i][1], pairs[i][2]);
  END LOOP;

  s := translate(s, E'\u200B\u200C\u200D\uFEFF', '');
  s := replace(s, E'\u00a0', ' ');
  s := regexp_replace(s, '[ \t]+', ' ', 'g');
  RETURN btrim(s);
END;
$func$;

COMMENT ON FUNCTION public.repair_mojibake_text(text) IS
  'Repair Latin-1<->UTF-8 mojibake. Pass-through for phones, emails, URLs, RBQ/NEQ, postal codes.';

-- 2. Add review flag columns
ALTER TABLE public.contractors_prospects
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

-- 3. Cleanup: contractors_prospects
UPDATE public.contractors_prospects SET
  business_name = public.repair_mojibake_text(business_name),
  legal_name    = public.repair_mojibake_text(legal_name),
  city          = public.repair_mojibake_text(city),
  region        = public.repair_mojibake_text(region),
  subcategory   = public.repair_mojibake_text(subcategory),
  service_area  = public.repair_mojibake_text(service_area),
  notes         = public.repair_mojibake_text(notes),
  needs_review  = (
    coalesce(business_name,'') ~ '(Ã[^[:ascii:]]|â€)' OR
    coalesce(city,'') ~ '(Ã[^[:ascii:]]|â€)' OR
    coalesce(region,'') ~ '(Ã[^[:ascii:]]|â€)' OR
    coalesce(notes,'') ~ '(Ã[^[:ascii:]]|â€)'
  )
WHERE
  coalesce(business_name,'') ~ '(Ã|Â|â€)' OR
  coalesce(legal_name,'') ~ '(Ã|Â|â€)' OR
  coalesce(city,'') ~ '(Ã|Â|â€)' OR
  coalesce(region,'') ~ '(Ã|Â|â€)' OR
  coalesce(subcategory,'') ~ '(Ã|Â|â€)' OR
  coalesce(service_area,'') ~ '(Ã|Â|â€)' OR
  coalesce(notes,'') ~ '(Ã|Â|â€)';

-- 4. Cleanup: contractor_prospects (skipping enum columns)
UPDATE public.contractor_prospects SET
  business_name = public.repair_mojibake_text(business_name),
  legal_name    = public.repair_mojibake_text(legal_name),
  owner_name    = public.repair_mojibake_text(owner_name),
  city          = public.repair_mojibake_text(city),
  region        = public.repair_mojibake_text(region),
  province      = public.repair_mojibake_text(province),
  address       = public.repair_mojibake_text(address),
  needs_review  = (
    coalesce(business_name,'') ~ '(Ã[^[:ascii:]]|â€)' OR
    coalesce(city,'') ~ '(Ã[^[:ascii:]]|â€)' OR
    coalesce(region,'') ~ '(Ã[^[:ascii:]]|â€)' OR
    coalesce(address,'') ~ '(Ã[^[:ascii:]]|â€)'
  )
WHERE
  coalesce(business_name,'') ~ '(Ã|Â|â€)' OR
  coalesce(legal_name,'') ~ '(Ã|Â|â€)' OR
  coalesce(owner_name,'') ~ '(Ã|Â|â€)' OR
  coalesce(city,'') ~ '(Ã|Â|â€)' OR
  coalesce(region,'') ~ '(Ã|Â|â€)' OR
  coalesce(address,'') ~ '(Ã|Â|â€)';

-- 5. Cleanup: contractors (legacy)
UPDATE public.contractors SET
  business_name = public.repair_mojibake_text(business_name),
  city          = public.repair_mojibake_text(city)
WHERE
  coalesce(business_name,'') ~ '(Ã|Â|â€)' OR
  coalesce(city,'') ~ '(Ã|Â|â€)';