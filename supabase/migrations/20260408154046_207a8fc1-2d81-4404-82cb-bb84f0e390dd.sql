
-- Table: appointment_values
CREATE TABLE public.appointment_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_size TEXT NOT NULL CHECK (project_size IN ('XS','S','M','L','XL')),
  label_fr TEXT NOT NULL,
  label_en TEXT,
  estimated_value_min INTEGER NOT NULL DEFAULT 0,
  estimated_value_max INTEGER NOT NULL DEFAULT 0,
  avg_duration_minutes INTEGER NOT NULL DEFAULT 60,
  conversion_rate NUMERIC(4,2) NOT NULL DEFAULT 0.50,
  icon_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read appointment_values" ON public.appointment_values FOR SELECT USING (true);

-- Table: project_types
CREATE TABLE public.project_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  category_fr TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('XS','S','M','L','XL')),
  avg_ticket INTEGER NOT NULL DEFAULT 0,
  urgency_score NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read project_types" ON public.project_types FOR SELECT USING (true);

-- Table: contractor_plan_limits
CREATE TABLE public.contractor_plan_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_code TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  min_appointments INTEGER NOT NULL DEFAULT 0,
  max_appointments INTEGER NOT NULL DEFAULT 0,
  allowed_sizes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contractor_plan_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read contractor_plan_limits" ON public.contractor_plan_limits FOR SELECT USING (true);
