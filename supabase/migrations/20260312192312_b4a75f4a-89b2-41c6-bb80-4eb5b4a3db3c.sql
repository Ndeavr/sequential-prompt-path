
-- Fix search_path warnings on immutable functions
CREATE OR REPLACE FUNCTION public.unpro_aipp_tier(score integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN score >= 90 THEN 'elite'
    WHEN score >= 75 THEN 'authority'
    WHEN score >= 60 THEN 'gold'
    WHEN score >= 40 THEN 'silver'
    ELSE 'bronze'
  END;
$$;

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
SET search_path = public
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
