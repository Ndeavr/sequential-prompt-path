ALTER TABLE public.contractor_pricing_quotes
  ADD COLUMN IF NOT EXISTS pricing_version text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS data_status text NOT NULL DEFAULT 'declared',
  ADD COLUMN IF NOT EXISTS factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS service_cities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_objective text,
  ADD COLUMN IF NOT EXISTS wants_exclusivity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cpq_pricing_version ON public.contractor_pricing_quotes(pricing_version);