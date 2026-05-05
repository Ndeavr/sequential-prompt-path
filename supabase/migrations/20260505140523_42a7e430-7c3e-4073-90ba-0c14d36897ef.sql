ALTER TABLE public.acq_subscriptions ADD COLUMN IF NOT EXISTS amount_paid numeric;
ALTER TABLE public.acq_coupon_redemptions ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE public.acq_coupon_redemptions ADD COLUMN IF NOT EXISTS amount_charged numeric;