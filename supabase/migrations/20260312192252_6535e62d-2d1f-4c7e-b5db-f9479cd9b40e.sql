
-- AIPP Tier function
CREATE OR REPLACE FUNCTION public.unpro_aipp_tier(score integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN score >= 90 THEN 'elite'
    WHEN score >= 75 THEN 'authority'
    WHEN score >= 60 THEN 'gold'
    WHEN score >= 40 THEN 'silver'
    ELSE 'bronze'
  END;
$$;

-- Contractor AIPP Scores table
CREATE TABLE public.contractor_aipp_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  total_score integer NOT NULL DEFAULT 0,
  tier text GENERATED ALWAYS AS (public.unpro_aipp_tier(total_score)) STORED,
  score_confidence integer DEFAULT 0,
  identity_score integer DEFAULT 0,
  trust_score integer DEFAULT 0,
  visibility_score integer DEFAULT 0,
  conversion_score integer DEFAULT 0,
  ai_seo_readiness_score integer DEFAULT 0,
  breakdown_json jsonb DEFAULT '{}'::jsonb,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_aipp_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can read own AIPP scores" ON public.contractor_aipp_scores
  FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Public can read current AIPP scores" ON public.contractor_aipp_scores
  FOR SELECT USING (is_current = true);

CREATE INDEX idx_contractor_aipp_scores_contractor ON public.contractor_aipp_scores(contractor_id);
CREATE INDEX idx_contractor_aipp_scores_current ON public.contractor_aipp_scores(contractor_id) WHERE is_current = true;

CREATE TRIGGER update_contractor_aipp_scores_updated_at BEFORE UPDATE ON public.contractor_aipp_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Set current AIPP score function (marks previous as not current)
CREATE OR REPLACE FUNCTION public.set_current_contractor_aipp_score(
  _contractor_id uuid,
  _score_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contractor_aipp_scores
    SET is_current = false
    WHERE contractor_id = _contractor_id AND id != _score_id;
  UPDATE public.contractor_aipp_scores
    SET is_current = true
    WHERE id = _score_id AND contractor_id = _contractor_id;
END;
$$;

-- Validate promo code function
CREATE OR REPLACE FUNCTION public.validate_unpro_promo_code(
  _code text,
  _plan_code text,
  _contractor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo record;
  usage_count integer;
BEGIN
  SELECT * INTO promo FROM public.promo_codes
    WHERE code = upper(_code) AND active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Code promo invalide.');
  END IF;

  IF NOT (_plan_code = ANY(promo.eligible_plan_codes)) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', format('Ce code est valide uniquement pour le plan %s.', array_to_string(promo.eligible_plan_codes, ', '))
    );
  END IF;

  IF promo.usage_limit_total IS NOT NULL THEN
    SELECT count(*) INTO usage_count FROM public.checkout_sessions WHERE promo_code = upper(_code) AND checkout_status IN ('paid','completed_free');
    IF usage_count >= promo.usage_limit_total THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Ce code promo a atteint sa limite d''utilisation.');
    END IF;
  END IF;

  IF promo.usage_limit_per_business IS NOT NULL AND _contractor_id IS NOT NULL THEN
    SELECT count(*) INTO usage_count FROM public.checkout_sessions WHERE promo_code = upper(_code) AND contractor_profile_id = _contractor_id AND checkout_status IN ('paid','completed_free');
    IF usage_count >= promo.usage_limit_per_business THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Vous avez déjà utilisé ce code promo.');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'discount_type', promo.discount_type,
    'discount_value', promo.discount_value,
    'label', promo.label
  );
END;
$$;

-- Calculate checkout totals function
CREATE OR REPLACE FUNCTION public.calculate_unpro_checkout_totals(
  _base_price integer,
  _setup_fee integer DEFAULT 0,
  _addons_total integer DEFAULT 0,
  _discount_type text DEFAULT 'none',
  _discount_value numeric DEFAULT 0,
  _tax_rate numeric DEFAULT 0.14975
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  subtotal integer;
  discount_amount integer;
  taxable integer;
  tax integer;
  total integer;
BEGIN
  subtotal := _base_price + _setup_fee + _addons_total;

  IF _discount_type = 'percentage' THEN
    discount_amount := round(subtotal * _discount_value / 100)::integer;
  ELSIF _discount_type = 'fixed' THEN
    discount_amount := least(_discount_value::integer, subtotal);
  ELSE
    discount_amount := 0;
  END IF;

  taxable := greatest(subtotal - discount_amount, 0);
  tax := round(taxable * _tax_rate)::integer;
  total := taxable + tax;

  RETURN jsonb_build_object(
    'subtotal_before_discount', subtotal,
    'discount_amount', discount_amount,
    'taxable_amount', taxable,
    'tax_amount', tax,
    'final_total', total
  );
END;
$$;
