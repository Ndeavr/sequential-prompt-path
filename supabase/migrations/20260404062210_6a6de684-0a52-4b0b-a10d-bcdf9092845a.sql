
-- =============================================
-- 1. project_sizing_ai_classifications
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_sizing_ai_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid,
  input_description text NOT NULL,
  input_budget_min numeric,
  input_budget_max numeric,
  input_budget_estimated numeric,
  classified_size_code text NOT NULL,
  confidence_score numeric NOT NULL DEFAULT 0,
  model_used text DEFAULT 'gemini-3-flash-preview',
  reasoning text,
  override_size_code text,
  override_by uuid,
  override_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_sizing_ai_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on project_sizing_ai"
  ON public.project_sizing_ai_classifications FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================
-- 2. signature_territory_locks
-- =============================================
CREATE TABLE IF NOT EXISTS public.signature_territory_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id uuid NOT NULL,
  cluster_id uuid,
  domain_id uuid,
  project_size_code text NOT NULL DEFAULT 'xxl',
  lock_status text NOT NULL DEFAULT 'active',
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  locked_by uuid,
  reason text,
  revenue_protected_monthly numeric DEFAULT 0,
  revenue_protected_annual numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signature_territory_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on territory_locks"
  ON public.signature_territory_locks FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================
-- 3. upgrade_pressure_events
-- =============================================
CREATE TABLE IF NOT EXISTS public.upgrade_pressure_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id uuid NOT NULL,
  target_project_size_code text NOT NULL,
  current_plan_code text NOT NULL,
  recommended_plan_code text NOT NULL,
  pressure_type text NOT NULL DEFAULT 'size_blocked',
  pressure_score numeric NOT NULL DEFAULT 0,
  message_fr text,
  message_en text,
  cta_action text,
  dismissed boolean DEFAULT false,
  converted boolean DEFAULT false,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.upgrade_pressure_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on upgrade_pressure"
  ON public.upgrade_pressure_events FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================
-- 4. dynamic_pricing_size_snapshots
-- =============================================
CREATE TABLE IF NOT EXISTS public.dynamic_pricing_size_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid,
  domain_id uuid,
  plan_code text NOT NULL,
  project_size_code text NOT NULL,
  base_monthly_price numeric NOT NULL,
  size_multiplier numeric NOT NULL DEFAULT 1.0,
  scarcity_multiplier numeric NOT NULL DEFAULT 1.0,
  cluster_value_multiplier numeric NOT NULL DEFAULT 1.0,
  seasonal_multiplier numeric NOT NULL DEFAULT 1.0,
  demand_multiplier numeric NOT NULL DEFAULT 1.0,
  final_monthly_price numeric NOT NULL,
  final_annual_price numeric NOT NULL,
  pricing_tier text DEFAULT 'standard',
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dynamic_pricing_size_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on pricing_snapshots"
  ON public.dynamic_pricing_size_snapshots FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sizing_ai_session ON public.project_sizing_ai_classifications(session_id);
CREATE INDEX IF NOT EXISTS idx_sizing_ai_size ON public.project_sizing_ai_classifications(classified_size_code);
CREATE INDEX IF NOT EXISTS idx_territory_locks_entrepreneur ON public.signature_territory_locks(entrepreneur_id);
CREATE INDEX IF NOT EXISTS idx_territory_locks_status ON public.signature_territory_locks(lock_status);
CREATE INDEX IF NOT EXISTS idx_upgrade_pressure_entrepreneur ON public.upgrade_pressure_events(entrepreneur_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_pressure_converted ON public.upgrade_pressure_events(converted);
CREATE INDEX IF NOT EXISTS idx_pricing_snapshots_plan_size ON public.dynamic_pricing_size_snapshots(plan_code, project_size_code);
