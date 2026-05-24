
ALTER TABLE public.aipp_profile_validations
  ADD COLUMN IF NOT EXISTS rbq_candidates jsonb,
  ADD COLUMN IF NOT EXISTS rbq_categories text[],
  ADD COLUMN IF NOT EXISTS rbq_valid_until date,
  ADD COLUMN IF NOT EXISTS rbq_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS neq_candidates jsonb,
  ADD COLUMN IF NOT EXISTS neq_verified_at timestamptz;
