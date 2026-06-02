
CREATE TABLE IF NOT EXISTS public.pim_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  inspection_date date,
  inspector_name text,
  summary text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pim_inspections_prop ON public.pim_inspections(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pim_inspections TO authenticated;
GRANT ALL ON public.pim_inspections TO service_role;
ALTER TABLE public.pim_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pim_inspections_owner_all" ON public.pim_inspections;
CREATE POLICY "pim_inspections_owner_all" ON public.pim_inspections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pim_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  grant_name text,
  status text,
  amount numeric,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pim_grants_prop ON public.pim_grants(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pim_grants TO authenticated;
GRANT ALL ON public.pim_grants TO service_role;
ALTER TABLE public.pim_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pim_grants_owner_all" ON public.pim_grants;
CREATE POLICY "pim_grants_owner_all" ON public.pim_grants FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pim_warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  item text,
  provider text,
  start_date date,
  end_date date,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pim_warranties_prop ON public.pim_warranties(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pim_warranties TO authenticated;
GRANT ALL ON public.pim_warranties TO service_role;
ALTER TABLE public.pim_warranties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pim_warranties_owner_all" ON public.pim_warranties;
CREATE POLICY "pim_warranties_owner_all" ON public.pim_warranties FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pim_maintenance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task text,
  performed_at date,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pim_maint_prop ON public.pim_maintenance_history(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pim_maintenance_history TO authenticated;
GRANT ALL ON public.pim_maintenance_history TO service_role;
ALTER TABLE public.pim_maintenance_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pim_maintenance_owner_all" ON public.pim_maintenance_history;
CREATE POLICY "pim_maintenance_owner_all" ON public.pim_maintenance_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pim_contractor_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  contractor_id uuid,
  contractor_name text,
  project_summary text,
  rating int,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pim_contractor_rel_prop ON public.pim_contractor_relationships(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pim_contractor_relationships TO authenticated;
GRANT ALL ON public.pim_contractor_relationships TO service_role;
ALTER TABLE public.pim_contractor_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pim_contractor_rel_owner_all" ON public.pim_contractor_relationships;
CREATE POLICY "pim_contractor_rel_owner_all" ON public.pim_contractor_relationships FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pim_risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  signal_type text,
  severity text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pim_risk_prop ON public.pim_risk_signals(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pim_risk_signals TO authenticated;
GRANT ALL ON public.pim_risk_signals TO service_role;
ALTER TABLE public.pim_risk_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pim_risk_owner_all" ON public.pim_risk_signals;
CREATE POLICY "pim_risk_owner_all" ON public.pim_risk_signals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_pim_inspections_updated BEFORE UPDATE ON public.pim_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pim_grants_updated BEFORE UPDATE ON public.pim_grants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pim_warranties_updated BEFORE UPDATE ON public.pim_warranties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pim_maintenance_updated BEFORE UPDATE ON public.pim_maintenance_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pim_contractor_rel_updated BEFORE UPDATE ON public.pim_contractor_relationships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pim_risk_updated BEFORE UPDATE ON public.pim_risk_signals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
