
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS relance_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_relance_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospects_relance_lookup
  ON public.prospects (funnel_status, last_relance_at)
  WHERE relance_count < 3;
