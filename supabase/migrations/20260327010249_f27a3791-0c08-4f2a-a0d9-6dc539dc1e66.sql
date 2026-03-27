
-- Promo code redemptions table for transactional validation
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE CASCADE,
  normalized_email text,
  normalized_phone text,
  checkout_session_id uuid REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  redemption_count_for_user integer DEFAULT 0,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','applied','rejected','consumed','reversed')),
  redeemed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_code ON public.promo_code_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_email ON public.promo_code_redemptions(normalized_email);
CREATE INDEX IF NOT EXISTS idx_redemptions_contractor ON public.promo_code_redemptions(contractor_id);

ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own redemptions" ON public.promo_code_redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Add freeone promo code (max 3 per user, fixed 100% discount, all plans)
INSERT INTO public.promo_codes (code, label, description, discount_type, discount_value, eligible_plan_codes, active, usage_limit_per_business)
VALUES ('FREEONE', 'Premier mois gratuit', 'Premier mois offert - max 3 utilisations', 'percentage', 100, ARRAY['recrue','pro','premium','elite','signature'], true, 3)
ON CONFLICT (code) DO NOTHING;

-- Add adaptive_pricing and presentment columns to checkout_sessions if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checkout_sessions' AND column_name='adaptive_pricing_enabled') THEN
    ALTER TABLE public.checkout_sessions ADD COLUMN adaptive_pricing_enabled boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checkout_sessions' AND column_name='presentment_currency') THEN
    ALTER TABLE public.checkout_sessions ADD COLUMN presentment_currency text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checkout_sessions' AND column_name='stripe_customer_id') THEN
    ALTER TABLE public.checkout_sessions ADD COLUMN stripe_customer_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checkout_sessions' AND column_name='stripe_subscription_id') THEN
    ALTER TABLE public.checkout_sessions ADD COLUMN stripe_subscription_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checkout_sessions' AND column_name='promo_redemption_id') THEN
    ALTER TABLE public.checkout_sessions ADD COLUMN promo_redemption_id uuid REFERENCES public.promo_code_redemptions(id);
  END IF;
END $$;

-- Transactional promo reservation function
CREATE OR REPLACE FUNCTION public.reserve_promo_code_redemption(
  p_code text,
  p_user_id uuid,
  p_contractor_id uuid,
  p_normalized_email text DEFAULT NULL,
  p_normalized_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_promo public.promo_codes%rowtype;
  v_count integer;
  v_redemption_id uuid;
BEGIN
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE upper(code) = upper(p_code)
    AND active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_or_inactive_code');
  END IF;

  -- Count existing valid redemptions across all identity signals
  SELECT count(*) INTO v_count
  FROM public.promo_code_redemptions r
  WHERE r.promo_code_id = v_promo.id
    AND r.status IN ('reserved','applied','consumed')
    AND (
      (p_user_id IS NOT NULL AND r.user_id = p_user_id)
      OR (p_contractor_id IS NOT NULL AND r.contractor_id = p_contractor_id)
      OR (p_normalized_email IS NOT NULL AND r.normalized_email = p_normalized_email)
      OR (p_normalized_phone IS NOT NULL AND r.normalized_phone = p_normalized_phone)
    );

  IF v_count >= COALESCE(v_promo.usage_limit_per_business, 3) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'max_redemptions_reached',
      'used_count', v_count,
      'max_allowed', v_promo.usage_limit_per_business
    );
  END IF;

  -- Check global limit
  IF v_promo.usage_limit_total IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM public.promo_code_redemptions
    WHERE promo_code_id = v_promo.id AND status IN ('applied','consumed');
    IF v_count >= v_promo.usage_limit_total THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'global_limit_reached');
    END IF;
  END IF;

  -- Re-count for user
  SELECT count(*) INTO v_count
  FROM public.promo_code_redemptions r
  WHERE r.promo_code_id = v_promo.id
    AND r.status IN ('reserved','applied','consumed')
    AND (
      (p_user_id IS NOT NULL AND r.user_id = p_user_id)
      OR (p_contractor_id IS NOT NULL AND r.contractor_id = p_contractor_id)
      OR (p_normalized_email IS NOT NULL AND r.normalized_email = p_normalized_email)
      OR (p_normalized_phone IS NOT NULL AND r.normalized_phone = p_normalized_phone)
    );

  INSERT INTO public.promo_code_redemptions (
    promo_code_id, user_id, contractor_id,
    normalized_email, normalized_phone,
    redemption_count_for_user, status
  ) VALUES (
    v_promo.id, p_user_id, p_contractor_id,
    p_normalized_email, p_normalized_phone,
    v_count + 1, 'reserved'
  ) RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'ok', true,
    'promo_code_id', v_promo.id,
    'redemption_id', v_redemption_id,
    'used_count', v_count + 1,
    'remaining', greatest(COALESCE(v_promo.usage_limit_per_business, 3) - (v_count + 1), 0),
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'eligible_plan_codes', v_promo.eligible_plan_codes
  );
END;
$$;
