-- Founder Activation Slots (10 slots hard-cap for the 1$/7d Founder offer)
CREATE TABLE public.founder_activation_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_number INT NOT NULL UNIQUE CHECK (slot_number BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reserved','active','expired')),
  contractor_id UUID NULL,
  funnel_id UUID NULL,
  stripe_session_id TEXT NULL,
  stripe_subscription_id TEXT NULL,
  claimed_at TIMESTAMPTZ NULL,
  activated_at TIMESTAMPTZ NULL,
  reserved_until TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.founder_activation_slots TO authenticated;
GRANT ALL ON public.founder_activation_slots TO service_role;

ALTER TABLE public.founder_activation_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_slots_read_authenticated"
ON public.founder_activation_slots FOR SELECT
TO authenticated
USING (true);

-- Seed 10 slots
INSERT INTO public.founder_activation_slots (slot_number)
SELECT g FROM generate_series(1,10) g
ON CONFLICT (slot_number) DO NOTHING;

-- Public view exposing only aggregate counts (readable by anon)
CREATE OR REPLACE VIEW public.v_founder_slots_public
WITH (security_invoker = true)
AS
SELECT
  COUNT(*) FILTER (WHERE status IN ('open')) AS remaining,
  COUNT(*) FILTER (WHERE status IN ('reserved','active')) AS claimed,
  COUNT(*) AS total
FROM public.founder_activation_slots;

GRANT SELECT ON public.v_founder_slots_public TO anon, authenticated;

-- Claim function: atomically reserve the lowest open slot (service_role callable)
CREATE OR REPLACE FUNCTION public.claim_founder_slot(
  p_funnel_id UUID,
  p_contractor_id UUID DEFAULT NULL,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_hold_minutes INT DEFAULT 30
)
RETURNS TABLE (slot_id UUID, slot_number INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
BEGIN
  -- Reuse an existing reservation for this funnel first
  SELECT id, slot_number INTO v_slot
  FROM public.founder_activation_slots
  WHERE funnel_id = p_funnel_id AND status IN ('reserved','active')
  LIMIT 1;

  IF FOUND THEN
    slot_id := v_slot.id; slot_number := v_slot.slot_number;
    RETURN NEXT; RETURN;
  END IF;

  -- Free expired reservations
  UPDATE public.founder_activation_slots
     SET status = 'open', funnel_id = NULL, reserved_until = NULL
   WHERE status = 'reserved' AND reserved_until < now();

  -- Grab the lowest available open slot
  UPDATE public.founder_activation_slots s
     SET status = 'reserved',
         funnel_id = p_funnel_id,
         contractor_id = COALESCE(p_contractor_id, s.contractor_id),
         stripe_session_id = COALESCE(p_stripe_session_id, s.stripe_session_id),
         reserved_until = now() + (p_hold_minutes || ' minutes')::interval,
         claimed_at = now(),
         updated_at = now()
   WHERE s.id = (
     SELECT id FROM public.founder_activation_slots
      WHERE status = 'open'
      ORDER BY slot_number ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
   )
  RETURNING s.id, s.slot_number INTO v_slot;

  IF NOT FOUND THEN
    RETURN;  -- no slots available
  END IF;

  slot_id := v_slot.id;
  slot_number := v_slot.slot_number;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_founder_slot(UUID, UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_founder_slot(UUID, UUID, TEXT, INT) TO service_role;

-- Update trigger
CREATE OR REPLACE FUNCTION public.update_founder_slots_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER founder_slots_updated_at
BEFORE UPDATE ON public.founder_activation_slots
FOR EACH ROW EXECUTE FUNCTION public.update_founder_slots_updated_at();