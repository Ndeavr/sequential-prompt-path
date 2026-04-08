
-- Extend promo_codes with additional fields
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'cad',
  ADD COLUMN IF NOT EXISTS duration_type text DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS duration_in_months integer,
  ADD COLUMN IF NOT EXISTS applies_to_billing_intervals text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_internal_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_partner_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_id uuid,
  ADD COLUMN IF NOT EXISTS is_founder_offer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_stackable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_coupon_id text,
  ADD COLUMN IF NOT EXISTS stripe_promotion_code_id text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS description_public text,
  ADD COLUMN IF NOT EXISTS current_redemptions_count integer DEFAULT 0;

-- Create billing_events_log table for Stripe webhook events
CREATE TABLE IF NOT EXISTS public.billing_events_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE,
  event_type text NOT NULL,
  livemode boolean DEFAULT true,
  payload_json jsonb DEFAULT '{}',
  processing_status text DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.billing_events_log ENABLE ROW LEVEL SECURITY;

-- RLS: admins can read billing events
CREATE POLICY "Admins can read billing events"
  ON public.billing_events_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: admins can insert billing events (from edge functions via service role, but also admin)
CREATE POLICY "Admins can insert billing events"
  ON public.billing_events_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add RLS policies for promo_codes admin management
CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read active public promo codes
CREATE POLICY "Users can read active public promo codes"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (active = true AND is_internal_only = false);

-- Index for billing events
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event ON public.billing_events_log(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON public.billing_events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes(active);
