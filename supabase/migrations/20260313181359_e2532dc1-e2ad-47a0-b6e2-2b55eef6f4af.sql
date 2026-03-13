
-- ═══════════════════════════════════════════════════════════
-- UNPRO Condos — Additional schema for Passeport Immeuble
-- ═══════════════════════════════════════════════════════════

-- 1. Extend syndicates with condo-specific fields
ALTER TABLE public.syndicates
  ADD COLUMN IF NOT EXISTS year_built integer,
  ADD COLUMN IF NOT EXISTS building_type text DEFAULT 'vertical',
  ADD COLUMN IF NOT EXISTS insurance_provider text,
  ADD COLUMN IF NOT EXISTS insurance_policy_number text,
  ADD COLUMN IF NOT EXISTS insurance_renewal_date date,
  ADD COLUMN IF NOT EXISTS loi16_inspection_done boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS loi16_inspection_date date,
  ADD COLUMN IF NOT EXISTS loi16_report_storage_path text,
  ADD COLUMN IF NOT EXISTS health_score integer,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'free';

-- 2. Building Components (lifecycle tracking)
CREATE TABLE IF NOT EXISTS public.syndicate_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  install_year integer,
  useful_life_years integer,
  remaining_life_years integer,
  estimated_replacement_cost numeric,
  condition_rating text DEFAULT 'good',
  last_inspection_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_components ENABLE ROW LEVEL SECURITY;

-- 3. Maintenance Tasks (calendar)
CREATE TABLE IF NOT EXISTS public.syndicate_maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  component_id uuid REFERENCES public.syndicate_components(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text DEFAULT 'preventive',
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  due_date date,
  completed_date date,
  estimated_cost numeric,
  actual_cost numeric,
  assigned_to text,
  recurrence text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Maintenance Logs (completed work history)
CREATE TABLE IF NOT EXISTS public.syndicate_maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.syndicate_maintenance_tasks(id) ON DELETE SET NULL,
  component_id uuid REFERENCES public.syndicate_components(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  performed_by text,
  cost numeric,
  performed_date date NOT NULL DEFAULT CURRENT_DATE,
  documents jsonb DEFAULT '[]',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- 5. Building Documents vault
CREATE TABLE IF NOT EXISTS public.syndicate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  tags text[] DEFAULT '{}',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_documents ENABLE ROW LEVEL SECURITY;

-- 6. Quote Analyses for condos
CREATE TABLE IF NOT EXISTS public.syndicate_quote_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  quotes jsonb DEFAULT '[]',
  comparison_result jsonb,
  recommendation text,
  status text DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_quote_analyses ENABLE ROW LEVEL SECURITY;

-- 7. Condo subscriptions (billing)
CREATE TABLE IF NOT EXISTS public.condo_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE UNIQUE,
  user_id uuid NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_tier text NOT NULL DEFAULT 'free',
  unit_count_tier text,
  price_cents integer DEFAULT 0,
  billing_interval text DEFAULT 'year',
  status text DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.condo_subscriptions ENABLE ROW LEVEL SECURITY;

-- 8. Audit logs for sensitive condo actions
CREATE TABLE IF NOT EXISTS public.syndicate_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_audit_logs ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- Components
CREATE POLICY "syndicate_components_select" ON public.syndicate_components
  FOR SELECT TO authenticated
  USING (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_components_insert" ON public.syndicate_components
  FOR INSERT TO authenticated
  WITH CHECK (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_components_update" ON public.syndicate_components
  FOR UPDATE TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_components_delete" ON public.syndicate_components
  FOR DELETE TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Maintenance Tasks
CREATE POLICY "syndicate_maintenance_tasks_select" ON public.syndicate_maintenance_tasks
  FOR SELECT TO authenticated
  USING (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_maintenance_tasks_insert" ON public.syndicate_maintenance_tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_maintenance_tasks_update" ON public.syndicate_maintenance_tasks
  FOR UPDATE TO authenticated
  USING (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_maintenance_tasks_delete" ON public.syndicate_maintenance_tasks
  FOR DELETE TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Maintenance Logs
CREATE POLICY "syndicate_maintenance_logs_select" ON public.syndicate_maintenance_logs
  FOR SELECT TO authenticated
  USING (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_maintenance_logs_insert" ON public.syndicate_maintenance_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_syndicate_member(auth.uid(), syndicate_id));

-- Documents
CREATE POLICY "syndicate_documents_select" ON public.syndicate_documents
  FOR SELECT TO authenticated
  USING (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_documents_insert" ON public.syndicate_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_documents_update" ON public.syndicate_documents
  FOR UPDATE TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_documents_delete" ON public.syndicate_documents
  FOR DELETE TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Quote Analyses
CREATE POLICY "syndicate_quote_analyses_select" ON public.syndicate_quote_analyses
  FOR SELECT TO authenticated
  USING (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_quote_analyses_insert" ON public.syndicate_quote_analyses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_quote_analyses_update" ON public.syndicate_quote_analyses
  FOR UPDATE TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Condo Subscriptions
CREATE POLICY "condo_subscriptions_select" ON public.condo_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "condo_subscriptions_manage" ON public.condo_subscriptions
  FOR ALL TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Audit Logs (read-only for members)
CREATE POLICY "syndicate_audit_logs_select" ON public.syndicate_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_syndicate_member(auth.uid(), syndicate_id));

CREATE POLICY "syndicate_audit_logs_insert" ON public.syndicate_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_syndicate_member(auth.uid(), syndicate_id));

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_syndicate_components
  BEFORE UPDATE ON public.syndicate_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_syndicate_maintenance_tasks
  BEFORE UPDATE ON public.syndicate_maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_syndicate_documents
  BEFORE UPDATE ON public.syndicate_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_syndicate_quote_analyses
  BEFORE UPDATE ON public.syndicate_quote_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_condo_subscriptions
  BEFORE UPDATE ON public.condo_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
