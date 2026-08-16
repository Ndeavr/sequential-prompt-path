ALTER TABLE public.contractor_activation_goals
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'goal',
  ADD COLUMN IF NOT EXISTS monthly_budget_cad numeric;

DO $$ BEGIN
  ALTER TABLE public.contractor_activation_goals
    ADD CONSTRAINT contractor_activation_goals_pricing_mode_chk
    CHECK (pricing_mode IN ('goal','budget'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;