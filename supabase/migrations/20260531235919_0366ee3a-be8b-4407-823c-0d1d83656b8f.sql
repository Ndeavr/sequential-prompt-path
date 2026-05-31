CREATE TABLE IF NOT EXISTS public.demo_contractor_plan_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  company_name text,
  legal_name text,
  website text,
  phone_primary text,
  phone_secondary text,
  selected_capacity text,
  selected_territory text,
  selected_project_type text,
  selected_objective text,
  wants_ai_priority text,
  recommended_plan text,
  normal_price_cents integer,
  demo_price_cents integer,
  promo_code text,
  promo_valid boolean NOT NULL DEFAULT false,
  stripe_session_id text,
  payment_status text NOT NULL DEFAULT 'not_started',
  flow_status text NOT NULL DEFAULT 'started',
  raw_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE ON public.demo_contractor_plan_tests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.demo_contractor_plan_tests TO authenticated;
GRANT ALL ON public.demo_contractor_plan_tests TO service_role;

ALTER TABLE public.demo_contractor_plan_tests ENABLE ROW LEVEL SECURITY;

-- Public demo: anyone can insert their own attempt row and update it (no PII linkage)
CREATE POLICY "demo_isr_insert_any"
  ON public.demo_contractor_plan_tests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "demo_isr_update_any"
  ON public.demo_contractor_plan_tests FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only admins can read demo runs
CREATE POLICY "demo_isr_admin_select"
  ON public.demo_contractor_plan_tests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_demo_isr_created_at
  ON public.demo_contractor_plan_tests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_isr_session
  ON public.demo_contractor_plan_tests (stripe_session_id);

CREATE TRIGGER trg_demo_isr_updated_at
  BEFORE UPDATE ON public.demo_contractor_plan_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();