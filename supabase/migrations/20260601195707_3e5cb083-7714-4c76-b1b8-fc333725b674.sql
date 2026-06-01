
-- Phase 1: contractor_pricing_quotes
DO $$ BEGIN
  CREATE TYPE public.pricing_quote_status AS ENUM ('draft','offered','accepted','paid','waitlisted','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.contractor_pricing_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  company_name text,
  trade_primary text,
  city text,
  territory_cluster text,
  target_monthly_appointments integer NOT NULL DEFAULT 0,
  average_project_value integer NOT NULL DEFAULT 0, -- in CAD dollars
  estimated_close_rate numeric(4,2) NOT NULL DEFAULT 0.30,
  estimated_monthly_revenue_potential integer NOT NULL DEFAULT 0,
  base_platform_fee integer NOT NULL DEFAULT 0,
  appointment_package_fee integer NOT NULL DEFAULT 0,
  territory_competition_multiplier numeric(4,2) NOT NULL DEFAULT 1.00,
  seasonality_multiplier numeric(4,2) NOT NULL DEFAULT 1.00,
  exclusivity_fee integer NOT NULL DEFAULT 0,
  aipp_optimization_fee integer NOT NULL DEFAULT 0,
  recommended_plan text NOT NULL DEFAULT 'pro',
  recommended_monthly_price integer NOT NULL DEFAULT 0,
  min_monthly_price integer NOT NULL DEFAULT 0,
  max_monthly_price integer NOT NULL DEFAULT 0,
  roi_estimate numeric(8,2) NOT NULL DEFAULT 0,
  pricing_status public.pricing_quote_status NOT NULL DEFAULT 'draft',
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  stripe_checkout_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpq_user ON public.contractor_pricing_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_cpq_contractor ON public.contractor_pricing_quotes(contractor_id);
CREATE INDEX IF NOT EXISTS idx_cpq_status ON public.contractor_pricing_quotes(pricing_status);
CREATE INDEX IF NOT EXISTS idx_cpq_created ON public.contractor_pricing_quotes(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.contractor_pricing_quotes TO authenticated;
GRANT ALL ON public.contractor_pricing_quotes TO service_role;

ALTER TABLE public.contractor_pricing_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own pricing quotes"
  ON public.contractor_pricing_quotes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Owners insert own pricing quotes"
  ON public.contractor_pricing_quotes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Owners update own pricing quotes"
  ON public.contractor_pricing_quotes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins delete pricing quotes"
  ON public.contractor_pricing_quotes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_cpq_updated_at
  BEFORE UPDATE ON public.contractor_pricing_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
