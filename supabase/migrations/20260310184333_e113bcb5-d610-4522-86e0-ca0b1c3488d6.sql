
-- Add structured analysis columns to quote_analysis
ALTER TABLE public.quote_analysis
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS strengths jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS concerns jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS missing_items jsonb DEFAULT '[]'::jsonb;
