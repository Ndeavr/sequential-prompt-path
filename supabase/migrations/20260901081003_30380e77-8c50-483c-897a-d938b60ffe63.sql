-- 1) Attribution permanente des codes promo à un affilié
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_promo_codes_affiliate ON public.promo_codes(affiliate_id) WHERE affiliate_id IS NOT NULL;

-- 2) Offres « 3 rendez-vous gratuits » posées par un affilié
CREATE TABLE IF NOT EXISTS public.affiliate_free_appointment_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  lead_id uuid,
  contractor_id uuid,
  company_name text,
  free_appointments integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'offered',
  promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  notes text,
  offered_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  accepted_at timestamptz,
  consumed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliate_free_offer_lead
  ON public.affiliate_free_appointment_offers(affiliate_id, lead_id)
  WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_affiliate_free_offer_contractor
  ON public.affiliate_free_appointment_offers(contractor_id);

GRANT SELECT, INSERT, UPDATE ON public.affiliate_free_appointment_offers TO authenticated;
GRANT ALL ON public.affiliate_free_appointment_offers TO service_role;

ALTER TABLE public.affiliate_free_appointment_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates read own free-appointment offers"
ON public.affiliate_free_appointment_offers
FOR SELECT TO authenticated
USING (
  affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins manage free-appointment offers"
ON public.affiliate_free_appointment_offers
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.affiliate_free_offers_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliate_free_offers_touch ON public.affiliate_free_appointment_offers;
CREATE TRIGGER trg_affiliate_free_offers_touch
BEFORE UPDATE ON public.affiliate_free_appointment_offers
FOR EACH ROW EXECUTE FUNCTION public.affiliate_free_offers_touch();

-- 3) Code promo personnel de l'affilié : 50 % sur le premier mois payé seulement
CREATE OR REPLACE FUNCTION public.affiliate_ensure_personal_promo(_affiliate_id uuid)
RETURNS TABLE(promo_code_id uuid, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
  v_code text;
  v_id uuid;
BEGIN
  SELECT upper(coalesce(a.referral_code, replace(a.id::text, '-', ''))) INTO v_ref
  FROM public.affiliates a WHERE a.id = _affiliate_id;

  IF v_ref IS NULL THEN
    RAISE EXCEPTION 'affiliate_not_found';
  END IF;

  v_code := left('AFF' || regexp_replace(v_ref, '[^A-Z0-9]', '', 'g'), 20) || '50';

  SELECT p.id INTO v_id FROM public.promo_codes p WHERE p.code = v_code;

  IF v_id IS NULL THEN
    INSERT INTO public.promo_codes (
      code, label, description_public, discount_type, discount_value,
      duration_type, duration_in_months, active, is_stackable,
      usage_limit_per_business, affiliate_id, currency
    ) VALUES (
      v_code,
      'Offre affilié — 50 % premier mois',
      '50 % de rabais sur le premier mois de votre plan personnalisé.',
      'percentage', 50,
      'once', 1, true, false,
      1, _affiliate_id, 'CAD'
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.promo_codes
       SET affiliate_id = coalesce(affiliate_id, _affiliate_id),
           active = true,
           discount_type = 'percentage',
           discount_value = 50,
           duration_type = 'once',
           updated_at = now()
     WHERE id = v_id;
  END IF;

  RETURN QUERY SELECT v_id, v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.affiliate_ensure_personal_promo(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.affiliate_ensure_personal_promo(uuid) TO service_role;

-- 4) Un affilié enregistre son offre de 3 rendez-vous gratuits
CREATE OR REPLACE FUNCTION public.affiliate_offer_free_appointments(
  _lead_id uuid,
  _company_name text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate_id uuid;
  v_promo record;
  v_offer_id uuid;
BEGIN
  SELECT a.id INTO v_affiliate_id
  FROM public.affiliates a
  WHERE a.user_id = auth.uid() AND coalesce(a.status, 'active') = 'active'
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_an_active_affiliate');
  END IF;

  SELECT * INTO v_promo FROM public.affiliate_ensure_personal_promo(v_affiliate_id);

  INSERT INTO public.affiliate_free_appointment_offers AS o
    (affiliate_id, lead_id, company_name, notes, promo_code_id)
  VALUES (v_affiliate_id, _lead_id, _company_name, _notes, v_promo.promo_code_id)
  ON CONFLICT (affiliate_id, lead_id) WHERE lead_id IS NOT NULL
  DO UPDATE SET
    status = CASE WHEN o.status = 'offered' THEN 'offered' ELSE o.status END,
    notes = coalesce(EXCLUDED.notes, o.notes),
    company_name = coalesce(EXCLUDED.company_name, o.company_name),
    promo_code_id = coalesce(o.promo_code_id, EXCLUDED.promo_code_id),
    expires_at = greatest(o.expires_at, now() + interval '30 days'),
    updated_at = now()
  RETURNING o.id INTO v_offer_id;

  RETURN jsonb_build_object(
    'ok', true,
    'offer_id', v_offer_id,
    'affiliate_id', v_affiliate_id,
    'free_appointments', 3,
    'promo_code', v_promo.code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.affiliate_offer_free_appointments(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.affiliate_offer_free_appointments(uuid, text, text) TO authenticated, service_role;