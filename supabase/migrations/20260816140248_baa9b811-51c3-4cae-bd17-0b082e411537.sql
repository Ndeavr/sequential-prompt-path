CREATE UNIQUE INDEX IF NOT EXISTS mcc_subscription_uidx
  ON public.market_capacity_commitments (subscription_id)
  WHERE subscription_id IS NOT NULL;