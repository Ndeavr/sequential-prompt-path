
-- =============================================
-- V1 Core: Missing tables for UNPRO platform
-- =============================================

-- 1. property_members — links properties to users with roles
CREATE TABLE public.property_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, user_id)
);
ALTER TABLE public.property_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own property memberships" ON public.property_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own property memberships" ON public.property_members
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all property memberships" ON public.property_members
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. property_documents — uploaded documents for properties
CREATE TABLE public.property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  file_url text,
  storage_path text,
  file_size integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own property documents" ON public.property_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all property documents" ON public.property_documents
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. property_scores — scoring snapshots for properties
CREATE TABLE public.property_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score_type text NOT NULL DEFAULT 'home_score',
  overall_score numeric NOT NULL DEFAULT 0,
  component_scores jsonb DEFAULT '{}'::jsonb,
  notes text,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own property scores" ON public.property_scores
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all property scores" ON public.property_scores
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. contractor_members — team members in a contractor business
CREATE TABLE public.contractor_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contractor_id, user_id)
);
ALTER TABLE public.contractor_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractor owners can manage members" ON public.contractor_members
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_members.contractor_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_members.contractor_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Members can view own membership" ON public.contractor_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all contractor members" ON public.contractor_members
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. project_matches — matching contractors to projects
CREATE TABLE public.project_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  match_score numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'proposed',
  explanation jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, contractor_id)
);
ALTER TABLE public.project_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view matches" ON public.project_matches
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_matches.project_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Matched contractors can view" ON public.project_matches
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = project_matches.contractor_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Admins can manage all project matches" ON public.project_matches
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages project matches" ON public.project_matches
  FOR ALL TO service_role USING (true);

-- 6. portfolios — grouping of properties for investors/managers
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  plan_type text NOT NULL DEFAULT 'personal',
  max_properties integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolios" ON public.portfolios
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all portfolios" ON public.portfolios
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. portfolio_properties — linking properties to portfolios
CREATE TABLE public.portfolio_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, property_id)
);
ALTER TABLE public.portfolio_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio owners can manage portfolio properties" ON public.portfolio_properties
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_properties.portfolio_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_properties.portfolio_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Admins can manage all portfolio properties" ON public.portfolio_properties
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. subscription_accounts — account-level subscription/plan info
CREATE TABLE public.subscription_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan_type text NOT NULL DEFAULT 'personal',
  max_properties integer NOT NULL DEFAULT 3,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscription_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages subscriptions" ON public.subscription_accounts
  FOR ALL TO service_role USING (true);
CREATE POLICY "Admins can manage all subscriptions" ON public.subscription_accounts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER set_updated_at_property_members BEFORE UPDATE ON public.property_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_property_documents BEFORE UPDATE ON public.property_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_contractor_members BEFORE UPDATE ON public.contractor_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_project_matches BEFORE UPDATE ON public.project_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_portfolios BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_subscription_accounts BEFORE UPDATE ON public.subscription_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
