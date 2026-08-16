ALTER TABLE public.contractor_pricing_quotes
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'goal',
  ADD COLUMN IF NOT EXISTS monthly_budget integer,
  ADD COLUMN IF NOT EXISTS guaranteed_appointments integer,
  ADD COLUMN IF NOT EXISTS contractor_capacity integer,
  ADD COLUMN IF NOT EXISTS market_capacity_snapshot jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contractor_pricing_quotes_pricing_mode_chk'
  ) THEN
    ALTER TABLE public.contractor_pricing_quotes
      ADD CONSTRAINT contractor_pricing_quotes_pricing_mode_chk
      CHECK (pricing_mode IN ('goal','budget'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS contractor_pricing_quotes_mode_idx
  ON public.contractor_pricing_quotes (pricing_mode, created_at DESC);

UPDATE public.pricing_config
SET weights = weights || jsonb_build_object(
  'appointment_delivery_cost_cents', 2500,
  'communication_cost_cents_per_appointment', 400,
  'operational_cost_cents_monthly', 1500,
  'min_margin_ratio', 0.35,
  'target_margin_ratio', 0.55
)
WHERE active = true;