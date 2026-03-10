
-- Contractor subscriptions table
CREATE TABLE public.contractor_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_id text NOT NULL DEFAULT 'recrue',
  status text NOT NULL DEFAULT 'inactive',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (contractor_id)
);

-- Enable RLS
ALTER TABLE public.contractor_subscriptions ENABLE ROW LEVEL SECURITY;

-- Contractors can view own subscription
CREATE POLICY "Contractors can view own subscription"
ON public.contractor_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = contractor_subscriptions.contractor_id
    AND c.user_id = auth.uid()
  )
);

-- Admins can manage all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
ON public.contractor_subscriptions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role / edge functions can insert/update (via supabase service role)
CREATE POLICY "Service can manage subscriptions"
ON public.contractor_subscriptions
FOR ALL
TO service_role
USING (true);

-- Index
CREATE INDEX idx_contractor_subscriptions_contractor ON public.contractor_subscriptions(contractor_id);
CREATE INDEX idx_contractor_subscriptions_stripe_customer ON public.contractor_subscriptions(stripe_customer_id);
CREATE INDEX idx_contractor_subscriptions_stripe_sub ON public.contractor_subscriptions(stripe_subscription_id);
