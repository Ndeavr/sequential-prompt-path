DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checkout_sessions' AND column_name='personalized_monthly_price_cents') THEN
    ALTER TABLE public.checkout_sessions ADD COLUMN personalized_monthly_price_cents integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checkout_sessions' AND column_name='quote_id') THEN
    ALTER TABLE public.checkout_sessions ADD COLUMN quote_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_quote_id ON public.checkout_sessions(quote_id);