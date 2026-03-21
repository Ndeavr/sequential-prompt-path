
-- Booking Transactions (revenue tracking)
CREATE TABLE IF NOT EXISTS public.booking_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.smart_bookings(id) ON DELETE SET NULL,
  contractor_id uuid NOT NULL,
  amount_total_cents integer NOT NULL DEFAULT 0,
  unpro_fee_cents integer NOT NULL DEFAULT 0,
  contractor_amount_cents integer NOT NULL DEFAULT 0,
  fee_rate numeric NOT NULL DEFAULT 0.30,
  currency text NOT NULL DEFAULT 'CAD',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_reference text,
  refunded boolean NOT NULL DEFAULT false,
  refund_amount_cents integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Booking Slot Scores (value scoring per slot)
CREATE TABLE IF NOT EXISTS public.booking_slot_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.smart_bookings(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  estimated_job_value_cents integer DEFAULT 0,
  close_probability numeric DEFAULT 0,
  travel_efficiency numeric DEFAULT 0,
  urgency_bonus numeric DEFAULT 0,
  dna_match_score numeric DEFAULT 0,
  breakdown_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Booking Pricing Rules (contractor-specific dynamic pricing)
CREATE TABLE IF NOT EXISTS public.booking_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  rule_type text NOT NULL,
  rule_key text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  description_fr text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contractor_id, rule_type, rule_key)
);

-- Add pricing fields to booking_appointment_types
ALTER TABLE public.booking_appointment_types
  ADD COLUMN IF NOT EXISTS refundable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS apply_to_final_invoice boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancellation_policy text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS deposit_amount_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_deposit boolean DEFAULT false;

-- Add revenue fields to smart_bookings
ALTER TABLE public.smart_bookings
  ADD COLUMN IF NOT EXISTS amount_total_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpro_fee_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contractor_amount_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS estimated_job_value_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS close_probability numeric DEFAULT 0;

-- RLS
ALTER TABLE public.booking_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_slot_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Transactions: contractor can read own
CREATE POLICY "contractor_read_own_transactions" ON public.booking_transactions
  FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Admin can read all transactions
CREATE POLICY "admin_read_all_transactions" ON public.booking_transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Slot scores: contractor can read own
CREATE POLICY "contractor_read_own_slot_scores" ON public.booking_slot_scores
  FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Pricing rules: contractor CRUD own
CREATE POLICY "contractor_manage_pricing_rules" ON public.booking_pricing_rules
  FOR ALL TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Public insert for transactions (from edge functions)
CREATE POLICY "service_insert_transactions" ON public.booking_transactions
  FOR INSERT TO anon
  WITH CHECK (true);

-- Public insert for slot scores
CREATE POLICY "service_insert_slot_scores" ON public.booking_slot_scores
  FOR INSERT TO anon
  WITH CHECK (true);
