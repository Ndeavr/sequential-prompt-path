
-- =============================================
-- Admin Entrepreneur Activation Module Tables
-- =============================================

-- 1. Import Jobs
CREATE TABLE public.admin_company_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  import_mode text NOT NULL DEFAULT 'manual',
  started_by_admin_id uuid NOT NULL,
  notes text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Import Sources
CREATE TABLE public.admin_company_import_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.admin_company_import_jobs(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'manual',
  source_label text,
  source_url text,
  source_payload_json jsonb DEFAULT '{}'::jsonb,
  trust_score integer DEFAULT 50,
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Import Conflicts
CREATE TABLE public.admin_import_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.admin_company_import_jobs(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  source_value_a text,
  source_value_b text,
  selected_value text,
  resolution_status text NOT NULL DEFAULT 'open',
  resolved_by_admin_id uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Activation Overrides (payment bypass)
CREATE TABLE public.admin_activation_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  subscription_id uuid,
  override_type text NOT NULL DEFAULT 'full_discount',
  override_value numeric NOT NULL DEFAULT 100,
  reason text,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_by_admin_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Appointment Readiness
CREATE TABLE public.admin_appointment_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE UNIQUE,
  checklist_score integer DEFAULT 0,
  has_linked_account boolean DEFAULT false,
  has_services boolean DEFAULT false,
  has_service_areas boolean DEFAULT false,
  has_active_plan boolean DEFAULT false,
  has_score boolean DEFAULT false,
  has_core_identity boolean DEFAULT false,
  has_media_minimum boolean DEFAULT false,
  has_public_profile boolean DEFAULT false,
  has_activation_override_or_payment boolean DEFAULT false,
  ready_status text NOT NULL DEFAULT 'not_ready',
  forced_by_admin_id uuid,
  forced_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Activation Checklists
CREATE TABLE public.admin_activation_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  item_code text NOT NULL,
  item_label text NOT NULL,
  item_status text NOT NULL DEFAULT 'pending',
  is_blocking boolean DEFAULT true,
  resolved_at timestamptz,
  resolved_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Admin Activation Events (audit trail)
CREATE TABLE public.admin_activation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  admin_user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- Enable RLS on all tables
-- =============================================
ALTER TABLE public.admin_company_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_company_import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_import_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_appointment_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activation_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activation_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies — Admin only
-- =============================================

-- Import Jobs
CREATE POLICY "Admins full access import_jobs" ON public.admin_company_import_jobs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Import Sources
CREATE POLICY "Admins full access import_sources" ON public.admin_company_import_sources
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Import Conflicts
CREATE POLICY "Admins full access import_conflicts" ON public.admin_import_conflicts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Activation Overrides
CREATE POLICY "Admins full access activation_overrides" ON public.admin_activation_overrides
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Appointment Readiness
CREATE POLICY "Admins full access appointment_readiness" ON public.admin_appointment_readiness
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Activation Checklists
CREATE POLICY "Admins full access activation_checklists" ON public.admin_activation_checklists
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Activation Events
CREATE POLICY "Admins full access activation_events" ON public.admin_activation_events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX idx_import_jobs_contractor ON public.admin_company_import_jobs(contractor_id);
CREATE INDEX idx_import_sources_job ON public.admin_company_import_sources(import_job_id);
CREATE INDEX idx_import_conflicts_job ON public.admin_import_conflicts(import_job_id);
CREATE INDEX idx_activation_overrides_contractor ON public.admin_activation_overrides(contractor_id);
CREATE INDEX idx_readiness_contractor ON public.admin_appointment_readiness(contractor_id);
CREATE INDEX idx_checklists_contractor ON public.admin_activation_checklists(contractor_id);
CREATE INDEX idx_activation_events_contractor ON public.admin_activation_events(contractor_id);
CREATE INDEX idx_activation_events_type ON public.admin_activation_events(event_type);
