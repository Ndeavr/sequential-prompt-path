
-- Add Stripe columns to booking_transactions
ALTER TABLE public.booking_transactions 
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Add payment-related status to smart_bookings if not already supporting it
-- (status is already text, so pending_payment is valid)
