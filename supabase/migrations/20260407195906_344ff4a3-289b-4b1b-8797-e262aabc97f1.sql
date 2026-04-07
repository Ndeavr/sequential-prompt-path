
CREATE TABLE public.homeowner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('plus', 'signature')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_checkout_session_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  promo_code TEXT,
  discount_percent INTEGER DEFAULT 0,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.homeowner_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own homeowner subscription"
  ON public.homeowner_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage homeowner subscriptions"
  ON public.homeowner_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_homeowner_subs_user ON public.homeowner_subscriptions(user_id);
CREATE INDEX idx_homeowner_subs_stripe ON public.homeowner_subscriptions(stripe_subscription_id);

CREATE OR REPLACE FUNCTION public.update_homeowner_sub_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_homeowner_sub_updated
  BEFORE UPDATE ON public.homeowner_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_homeowner_sub_updated_at();
