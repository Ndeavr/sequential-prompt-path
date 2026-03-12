
-- Plan Catalog table
CREATE TABLE public.plan_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  position_rank integer NOT NULL DEFAULT 0,
  monthly_price integer NOT NULL DEFAULT 0,
  annual_price integer NOT NULL DEFAULT 0,
  setup_fee integer NOT NULL DEFAULT 0,
  badge_text text,
  short_pitch text,
  best_for text,
  summary_outcome text,
  includes_json jsonb DEFAULT '[]'::jsonb,
  recommended_for_json jsonb DEFAULT '[]'::jsonb,
  objective_fit_json jsonb DEFAULT '[]'::jsonb,
  aipp_fit_min integer NOT NULL DEFAULT 0,
  aipp_fit_max integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan_catalog" ON public.plan_catalog FOR SELECT USING (true);

CREATE TRIGGER update_plan_catalog_updated_at BEFORE UPDATE ON public.plan_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Promo Codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  eligible_plan_codes text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit_total integer,
  usage_limit_per_business integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active promo_codes" ON public.promo_codes FOR SELECT USING (active = true);

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Checkout Sessions table
CREATE TABLE public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_profile_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  selected_plan_id uuid REFERENCES public.plan_catalog(id),
  selected_plan_code text,
  selected_plan_name text,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  base_price integer NOT NULL DEFAULT 0,
  setup_fee integer NOT NULL DEFAULT 0,
  addons_json jsonb DEFAULT '[]'::jsonb,
  addons_total integer NOT NULL DEFAULT 0,
  subtotal_before_discount integer NOT NULL DEFAULT 0,
  promo_code text,
  promo_code_type text,
  discount_type text NOT NULL DEFAULT 'none',
  discount_value numeric NOT NULL DEFAULT 0,
  discount_amount integer NOT NULL DEFAULT 0,
  taxable_amount integer NOT NULL DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  final_total_after_discount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  checkout_status text NOT NULL DEFAULT 'draft',
  payment_provider text,
  external_checkout_id text,
  card_required boolean NOT NULL DEFAULT true,
  zero_dollar_activation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own checkout_sessions" ON public.checkout_sessions
  FOR SELECT TO authenticated
  USING (
    contractor_profile_id IN (
      SELECT id FROM public.contractors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own checkout_sessions" ON public.checkout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    contractor_profile_id IN (
      SELECT id FROM public.contractors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own checkout_sessions" ON public.checkout_sessions
  FOR UPDATE TO authenticated
  USING (
    contractor_profile_id IN (
      SELECT id FROM public.contractors WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_checkout_sessions_updated_at BEFORE UPDATE ON public.checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
