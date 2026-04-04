
-- Project sizes reference table
CREATE TABLE public.project_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  units_consumed_per_appointment NUMERIC(4,2) NOT NULL,
  capture_factor NUMERIC(5,3) NOT NULL DEFAULT 0.020,
  size_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.project_sizes (code, label, sort_order, units_consumed_per_appointment, capture_factor, size_multiplier) VALUES
  ('xs', 'XS', 1, 0.50, 0.015, 0.70),
  ('s', 'S', 2, 1.00, 0.020, 1.00),
  ('m', 'M', 3, 1.50, 0.030, 1.20),
  ('l', 'L', 4, 2.00, 0.040, 1.50),
  ('xl', 'XL', 5, 3.00, 0.055, 2.00),
  ('xxl', 'XXL', 6, 5.00, 0.075, 3.00);

ALTER TABLE public.project_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read project sizes" ON public.project_sizes FOR SELECT USING (true);
CREATE POLICY "Admins manage project sizes" ON public.project_sizes FOR ALL USING (public.is_admin());

-- Plan included appointments
CREATE TABLE public.plan_included_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL,
  included_appointments_monthly INTEGER NOT NULL,
  included_units_monthly NUMERIC(6,2) NOT NULL,
  base_extra_appointment_price NUMERIC(8,2) NOT NULL DEFAULT 99,
  can_rollover_unused_appointments BOOLEAN NOT NULL DEFAULT false,
  rollover_cap_units NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_code)
);

INSERT INTO public.plan_included_appointments (plan_code, included_appointments_monthly, included_units_monthly, base_extra_appointment_price) VALUES
  ('recrue', 4, 4.0, 79),
  ('pro', 8, 10.0, 99),
  ('premium', 15, 22.0, 129),
  ('elite', 25, 40.0, 169),
  ('signature', 40, 75.0, 229);

ALTER TABLE public.plan_included_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan appointments" ON public.plan_included_appointments FOR SELECT USING (true);
CREATE POLICY "Admins manage plan appointments" ON public.plan_included_appointments FOR ALL USING (public.is_admin());

-- Plan project size access
CREATE TABLE public.plan_project_size_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL,
  project_size_id UUID NOT NULL REFERENCES public.project_sizes(id) ON DELETE CASCADE,
  access_allowed BOOLEAN NOT NULL DEFAULT false,
  upgrade_target_plan_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_code, project_size_id)
);

-- Seed access rules
INSERT INTO public.plan_project_size_access (plan_code, project_size_id, access_allowed, upgrade_target_plan_code)
SELECT plan_code, ps.id, 
  CASE
    WHEN plan_code = 'recrue' AND ps.code IN ('xs','s') THEN true
    WHEN plan_code = 'pro' AND ps.code IN ('xs','s','m') THEN true
    WHEN plan_code = 'premium' AND ps.code IN ('xs','s','m','l') THEN true
    WHEN plan_code = 'elite' AND ps.code IN ('xs','s','m','l','xl') THEN true
    WHEN plan_code = 'signature' THEN true
    ELSE false
  END,
  CASE
    WHEN plan_code = 'recrue' AND ps.code = 'm' THEN 'pro'
    WHEN plan_code = 'recrue' AND ps.code IN ('l','xl','xxl') THEN 'premium'
    WHEN plan_code = 'pro' AND ps.code = 'l' THEN 'premium'
    WHEN plan_code = 'pro' AND ps.code IN ('xl','xxl') THEN 'elite'
    WHEN plan_code = 'premium' AND ps.code = 'xl' THEN 'elite'
    WHEN plan_code = 'premium' AND ps.code = 'xxl' THEN 'signature'
    WHEN plan_code = 'elite' AND ps.code = 'xxl' THEN 'signature'
    ELSE NULL
  END
FROM (VALUES ('recrue'),('pro'),('premium'),('elite'),('signature')) AS plans(plan_code)
CROSS JOIN public.project_sizes ps;

ALTER TABLE public.plan_project_size_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan size access" ON public.plan_project_size_access FOR SELECT USING (true);
CREATE POLICY "Admins manage plan size access" ON public.plan_project_size_access FOR ALL USING (public.is_admin());

-- Extra appointment pricing rules
CREATE TABLE public.extra_appointment_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL,
  project_size_code TEXT NOT NULL,
  cluster_value_tier TEXT DEFAULT 'medium',
  scarcity_status TEXT DEFAULT 'open',
  base_extra_price NUMERIC(8,2) NOT NULL,
  size_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  scarcity_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  cluster_value_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  monetization_floor_factor NUMERIC(4,3) NOT NULL DEFAULT 0.120,
  computed_final_price NUMERIC(8,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.extra_appointment_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read extra pricing" ON public.extra_appointment_pricing_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage extra pricing" ON public.extra_appointment_pricing_rules FOR ALL USING (public.is_admin());

-- Entrepreneur plan usage (monthly tracking)
CREATE TABLE public.entrepreneur_plan_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  billing_cycle_start TIMESTAMPTZ NOT NULL,
  billing_cycle_end TIMESTAMPTZ NOT NULL,
  included_appointments_monthly INTEGER NOT NULL DEFAULT 0,
  included_units_monthly NUMERIC(6,2) NOT NULL DEFAULT 0,
  consumed_appointments_count INTEGER NOT NULL DEFAULT 0,
  consumed_units NUMERIC(6,2) NOT NULL DEFAULT 0,
  remaining_units NUMERIC(6,2) NOT NULL DEFAULT 0,
  overage_appointments_count INTEGER NOT NULL DEFAULT 0,
  overage_units NUMERIC(6,2) NOT NULL DEFAULT 0,
  overage_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  upgrade_recommended BOOLEAN NOT NULL DEFAULT false,
  upgrade_target_plan TEXT,
  upgrade_savings_projected NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contractor_id, billing_cycle_start)
);

ALTER TABLE public.entrepreneur_plan_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all usage" ON public.entrepreneur_plan_usage FOR SELECT USING (public.is_admin());
CREATE POLICY "Entrepreneurs read own usage" ON public.entrepreneur_plan_usage FOR SELECT USING (public.owns_contractor(contractor_id));
CREATE POLICY "Admins manage usage" ON public.entrepreneur_plan_usage FOR ALL USING (public.is_admin());

-- Entrepreneur extra appointments
CREATE TABLE public.entrepreneur_extra_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  project_size_code TEXT NOT NULL,
  units_consumed NUMERIC(4,2) NOT NULL,
  extra_price NUMERIC(8,2) NOT NULL,
  billing_status TEXT NOT NULL DEFAULT 'pending',
  invoice_line_status TEXT DEFAULT 'pending',
  billing_cycle_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entrepreneur_extra_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all extras" ON public.entrepreneur_extra_appointments FOR SELECT USING (public.is_admin());
CREATE POLICY "Entrepreneurs read own extras" ON public.entrepreneur_extra_appointments FOR SELECT USING (public.owns_contractor(contractor_id));
CREATE POLICY "Admins manage extras" ON public.entrepreneur_extra_appointments FOR ALL USING (public.is_admin());

-- Monthly appointment summary
CREATE TABLE public.entrepreneur_monthly_appointment_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  billing_month DATE NOT NULL,
  included_units NUMERIC(6,2) NOT NULL DEFAULT 0,
  consumed_units NUMERIC(6,2) NOT NULL DEFAULT 0,
  extra_units NUMERIC(6,2) NOT NULL DEFAULT 0,
  included_appointments_count INTEGER NOT NULL DEFAULT 0,
  extra_appointments_count INTEGER NOT NULL DEFAULT 0,
  subscription_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  extra_appointment_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  average_revenue_per_appointment NUMERIC(8,2) DEFAULT 0,
  average_revenue_per_unit NUMERIC(8,2) DEFAULT 0,
  upgrade_pressure_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contractor_id, billing_month)
);

ALTER TABLE public.entrepreneur_monthly_appointment_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all summaries" ON public.entrepreneur_monthly_appointment_summary FOR SELECT USING (public.is_admin());
CREATE POLICY "Entrepreneurs read own summaries" ON public.entrepreneur_monthly_appointment_summary FOR SELECT USING (public.owns_contractor(contractor_id));
CREATE POLICY "Admins manage summaries" ON public.entrepreneur_monthly_appointment_summary FOR ALL USING (public.is_admin());

-- Appointment billing events (audit)
CREATE TABLE public.appointment_billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  units_delta NUMERIC(4,2) NOT NULL DEFAULT 0,
  amount_delta NUMERIC(8,2) NOT NULL DEFAULT 0,
  reason TEXT,
  billable BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all events" ON public.appointment_billing_events FOR SELECT USING (public.is_admin());
CREATE POLICY "Entrepreneurs read own events" ON public.appointment_billing_events FOR SELECT USING (public.owns_contractor(contractor_id));
CREATE POLICY "Admins manage events" ON public.appointment_billing_events FOR ALL USING (public.is_admin());

-- Appointment value history
CREATE TABLE public.appointment_value_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_value_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read value history" ON public.appointment_value_history FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins manage value history" ON public.appointment_value_history FOR ALL USING (public.is_admin());

-- Indexes
CREATE INDEX idx_plan_usage_contractor ON public.entrepreneur_plan_usage(contractor_id);
CREATE INDEX idx_plan_usage_cycle ON public.entrepreneur_plan_usage(billing_cycle_start);
CREATE INDEX idx_extra_appts_contractor ON public.entrepreneur_extra_appointments(contractor_id);
CREATE INDEX idx_extra_appts_cycle ON public.entrepreneur_extra_appointments(billing_cycle_start);
CREATE INDEX idx_monthly_summary_contractor ON public.entrepreneur_monthly_appointment_summary(contractor_id);
CREATE INDEX idx_billing_events_contractor ON public.appointment_billing_events(contractor_id);
