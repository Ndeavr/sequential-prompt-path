
-- ═══════════════════════════════════════════════
-- ENTREPRENEUR TABLES
-- ═══════════════════════════════════════════════

CREATE TABLE public.entrepreneur_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_type TEXT,
  service_zone TEXT,
  annual_revenue_target INTEGER,
  current_situation TEXT DEFAULT 'startup',
  monthly_capacity INTEGER DEFAULT 5,
  avg_project_value INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.entrepreneur_plan_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recommended_plan TEXT NOT NULL,
  reasoning TEXT,
  monthly_rdv_needed INTEGER,
  projected_revenue INTEGER,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.entrepreneur_profile_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  step_code TEXT NOT NULL,
  step_label TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.entrepreneur_revenue_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.entrepreneur_goals(id) ON DELETE CASCADE,
  annual_target INTEGER NOT NULL,
  avg_project_value INTEGER NOT NULL,
  estimated_margin_pct NUMERIC(5,2) DEFAULT 30,
  rdv_needed_annual INTEGER NOT NULL,
  rdv_needed_monthly INTEGER NOT NULL,
  recommended_plan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- CONDO MANAGEMENT TABLES
-- ═══════════════════════════════════════════════

CREATE TABLE public.condo_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  building_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  unit_count INTEGER,
  year_built INTEGER,
  building_type TEXT DEFAULT 'condo',
  reserve_fund_amount INTEGER DEFAULT 0,
  recent_major_works TEXT,
  syndicate_name TEXT,
  manager_name TEXT,
  manager_email TEXT,
  manager_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.condo_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id UUID REFERENCES public.condo_profiles(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'general',
  is_loi16_required BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'uploaded',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.condo_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id UUID REFERENCES public.condo_profiles(id) ON DELETE CASCADE NOT NULL,
  check_type TEXT NOT NULL,
  check_label TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  is_required BOOLEAN DEFAULT true,
  due_date TIMESTAMPTZ,
  notes TEXT,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.condo_action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id UUID REFERENCES public.condo_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'maintenance',
  estimated_cost_min INTEGER,
  estimated_cost_max INTEGER,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'planned',
  assigned_contractor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.condo_maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id UUID REFERENCES public.condo_profiles(id) ON DELETE CASCADE NOT NULL,
  task_title TEXT NOT NULL,
  task_description TEXT,
  frequency TEXT DEFAULT 'annual',
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  estimated_cost INTEGER,
  next_due_date TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- CONTACT CAPTURES (referenced in master prompt)
-- ═══════════════════════════════════════════════

CREATE TABLE public.alex_contact_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  first_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  project_type TEXT,
  source TEXT DEFAULT 'alex_conversation',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════

ALTER TABLE public.entrepreneur_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrepreneur_plan_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrepreneur_profile_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrepreneur_revenue_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condo_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condo_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condo_action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condo_maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_contact_captures ENABLE ROW LEVEL SECURITY;

-- Entrepreneur: users see own data
CREATE POLICY "Users manage own goals" ON public.entrepreneur_goals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own plan recs" ON public.entrepreneur_plan_recommendations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own profile progress" ON public.entrepreneur_profile_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own projections" ON public.entrepreneur_revenue_projections FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Condo: users see own data
CREATE POLICY "Users manage own condo profiles" ON public.condo_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own condo docs" ON public.condo_documents FOR ALL TO authenticated USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Users view condo compliance" ON public.condo_compliance_checks FOR SELECT TO authenticated USING (condo_id IN (SELECT id FROM public.condo_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users manage condo compliance" ON public.condo_compliance_checks FOR ALL TO authenticated USING (condo_id IN (SELECT id FROM public.condo_profiles WHERE user_id = auth.uid())) WITH CHECK (condo_id IN (SELECT id FROM public.condo_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users manage condo actions" ON public.condo_action_plans FOR ALL TO authenticated USING (condo_id IN (SELECT id FROM public.condo_profiles WHERE user_id = auth.uid())) WITH CHECK (condo_id IN (SELECT id FROM public.condo_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users manage condo maintenance" ON public.condo_maintenance_tasks FOR ALL TO authenticated USING (condo_id IN (SELECT id FROM public.condo_profiles WHERE user_id = auth.uid())) WITH CHECK (condo_id IN (SELECT id FROM public.condo_profiles WHERE user_id = auth.uid()));

-- Contact captures: public insert via edge functions
CREATE POLICY "Anon insert contact captures" ON public.alex_contact_captures FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Users view own captures" ON public.alex_contact_captures FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_entrepreneur_goals_user ON public.entrepreneur_goals(user_id);
CREATE INDEX idx_entrepreneur_projections_user ON public.entrepreneur_revenue_projections(user_id);
CREATE INDEX idx_condo_profiles_user ON public.condo_profiles(user_id);
CREATE INDEX idx_condo_profiles_city ON public.condo_profiles(city);
CREATE INDEX idx_condo_docs_condo ON public.condo_documents(condo_id);
CREATE INDEX idx_condo_compliance_condo ON public.condo_compliance_checks(condo_id);
CREATE INDEX idx_condo_actions_condo ON public.condo_action_plans(condo_id);
CREATE INDEX idx_condo_maintenance_condo ON public.condo_maintenance_tasks(condo_id);
CREATE INDEX idx_alex_contact_captures_session ON public.alex_contact_captures(session_id);
