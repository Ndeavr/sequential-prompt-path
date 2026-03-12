
-- =============================================
-- V2 Syndicate System for UNPRO
-- =============================================

-- Enum for syndicate member roles
CREATE TYPE public.syndicate_member_role AS ENUM ('owner', 'board_member', 'manager', 'administrator');

-- Enum for vote status
CREATE TYPE public.vote_status AS ENUM ('draft', 'open', 'closed', 'cancelled');

-- 1. syndicates — condo/building governance entities
CREATE TABLE public.syndicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  province text DEFAULT 'QC',
  postal_code text,
  unit_count integer DEFAULT 0,
  fiscal_year_start integer DEFAULT 1,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicates ENABLE ROW LEVEL SECURITY;

-- 2. syndicate_members — who belongs to a syndicate
CREATE TABLE public.syndicate_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  role syndicate_member_role NOT NULL DEFAULT 'owner',
  unit_number text,
  share_percentage numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(syndicate_id, user_id)
);
ALTER TABLE public.syndicate_members ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of a syndicate
CREATE OR REPLACE FUNCTION public.is_syndicate_member(_user_id uuid, _syndicate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE user_id = _user_id
      AND syndicate_id = _syndicate_id
      AND is_active = true
  )
$$;

-- Helper: check if user is board/manager/admin of a syndicate
CREATE OR REPLACE FUNCTION public.is_syndicate_admin(_user_id uuid, _syndicate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.syndicate_members
    WHERE user_id = _user_id
      AND syndicate_id = _syndicate_id
      AND is_active = true
      AND role IN ('board_member', 'manager', 'administrator')
  )
$$;

-- RLS for syndicates
CREATE POLICY "Syndicate members can view their syndicate" ON public.syndicates
  FOR SELECT TO authenticated USING (public.is_syndicate_member(auth.uid(), id));
CREATE POLICY "Syndicate admins can update" ON public.syndicates
  FOR UPDATE TO authenticated USING (public.is_syndicate_admin(auth.uid(), id));
CREATE POLICY "Authenticated users can create syndicates" ON public.syndicates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can manage all syndicates" ON public.syndicates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS for syndicate_members
CREATE POLICY "Members can view co-members" ON public.syndicate_members
  FOR SELECT TO authenticated USING (public.is_syndicate_member(auth.uid(), syndicate_id));
CREATE POLICY "Syndicate admins can manage members" ON public.syndicate_members
  FOR ALL TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));
CREATE POLICY "Users can view own membership" ON public.syndicate_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all syndicate members" ON public.syndicate_members
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. syndicate_reserve_fund_snapshots
CREATE TABLE public.syndicate_reserve_fund_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  balance numeric NOT NULL DEFAULT 0,
  target_balance numeric,
  annual_contribution numeric DEFAULT 0,
  funding_ratio numeric DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_reserve_fund_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reserve fund" ON public.syndicate_reserve_fund_snapshots
  FOR SELECT TO authenticated USING (public.is_syndicate_member(auth.uid(), syndicate_id));
CREATE POLICY "Syndicate admins can manage reserve fund" ON public.syndicate_reserve_fund_snapshots
  FOR ALL TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));
CREATE POLICY "Admins can manage all reserve funds" ON public.syndicate_reserve_fund_snapshots
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. syndicate_maintenance_plans
CREATE TABLE public.syndicate_maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  plan_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  status text NOT NULL DEFAULT 'draft',
  total_budget numeric DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_maintenance_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view maintenance plans" ON public.syndicate_maintenance_plans
  FOR SELECT TO authenticated USING (public.is_syndicate_member(auth.uid(), syndicate_id));
CREATE POLICY "Syndicate admins can manage maintenance plans" ON public.syndicate_maintenance_plans
  FOR ALL TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));
CREATE POLICY "Admins can manage all maintenance plans" ON public.syndicate_maintenance_plans
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. syndicate_maintenance_items
CREATE TABLE public.syndicate_maintenance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.syndicate_maintenance_plans(id) ON DELETE CASCADE,
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general',
  priority text DEFAULT 'normal',
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric,
  scheduled_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'planned',
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view maintenance items" ON public.syndicate_maintenance_items
  FOR SELECT TO authenticated USING (public.is_syndicate_member(auth.uid(), syndicate_id));
CREATE POLICY "Syndicate admins can manage maintenance items" ON public.syndicate_maintenance_items
  FOR ALL TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));
CREATE POLICY "Admins can manage all maintenance items" ON public.syndicate_maintenance_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. syndicate_capex_forecasts
CREATE TABLE public.syndicate_capex_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  component text NOT NULL,
  description text,
  estimated_cost numeric NOT NULL DEFAULT 0,
  forecast_year integer NOT NULL,
  useful_life_years integer,
  remaining_life_years integer,
  replacement_priority text DEFAULT 'normal',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_capex_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view capex forecasts" ON public.syndicate_capex_forecasts
  FOR SELECT TO authenticated USING (public.is_syndicate_member(auth.uid(), syndicate_id));
CREATE POLICY "Syndicate admins can manage capex forecasts" ON public.syndicate_capex_forecasts
  FOR ALL TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));
CREATE POLICY "Admins can manage all capex forecasts" ON public.syndicate_capex_forecasts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. syndicate_budget_items
CREATE TABLE public.syndicate_budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  category text NOT NULL DEFAULT 'operating',
  label text NOT NULL,
  budgeted_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view budget items" ON public.syndicate_budget_items
  FOR SELECT TO authenticated USING (public.is_syndicate_member(auth.uid(), syndicate_id));
CREATE POLICY "Syndicate admins can manage budget items" ON public.syndicate_budget_items
  FOR ALL TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));
CREATE POLICY "Admins can manage all budget items" ON public.syndicate_budget_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. syndicate_votes
CREATE TABLE public.syndicate_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  vote_type text NOT NULL DEFAULT 'simple_majority',
  status vote_status NOT NULL DEFAULT 'draft',
  quorum_percentage numeric NOT NULL DEFAULT 50,
  required_majority numeric NOT NULL DEFAULT 50,
  opens_at timestamptz,
  closes_at timestamptz,
  result_summary jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view votes" ON public.syndicate_votes
  FOR SELECT TO authenticated USING (public.is_syndicate_member(auth.uid(), syndicate_id));
CREATE POLICY "Syndicate admins can manage votes" ON public.syndicate_votes
  FOR ALL TO authenticated
  USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));
CREATE POLICY "Admins can manage all votes" ON public.syndicate_votes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. syndicate_vote_choices
CREATE TABLE public.syndicate_vote_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL REFERENCES public.syndicate_votes(id) ON DELETE CASCADE,
  label text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_vote_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view vote choices" ON public.syndicate_vote_choices
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.syndicate_votes v WHERE v.id = syndicate_vote_choices.vote_id AND public.is_syndicate_member(auth.uid(), v.syndicate_id))
  );
CREATE POLICY "Syndicate admins can manage vote choices" ON public.syndicate_vote_choices
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.syndicate_votes v WHERE v.id = syndicate_vote_choices.vote_id AND public.is_syndicate_admin(auth.uid(), v.syndicate_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.syndicate_votes v WHERE v.id = syndicate_vote_choices.vote_id AND public.is_syndicate_admin(auth.uid(), v.syndicate_id))
  );
CREATE POLICY "Admins can manage all vote choices" ON public.syndicate_vote_choices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. syndicate_vote_responses
CREATE TABLE public.syndicate_vote_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL REFERENCES public.syndicate_votes(id) ON DELETE CASCADE,
  choice_id uuid NOT NULL REFERENCES public.syndicate_vote_choices(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.syndicate_members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  weight numeric DEFAULT 1,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vote_id, member_id)
);
ALTER TABLE public.syndicate_vote_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view vote responses" ON public.syndicate_vote_responses
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.syndicate_votes v WHERE v.id = syndicate_vote_responses.vote_id AND public.is_syndicate_member(auth.uid(), v.syndicate_id))
  );
CREATE POLICY "Members can submit own vote" ON public.syndicate_vote_responses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all vote responses" ON public.syndicate_vote_responses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER set_updated_at_syndicates BEFORE UPDATE ON public.syndicates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_syndicate_members BEFORE UPDATE ON public.syndicate_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_syndicate_maintenance_plans BEFORE UPDATE ON public.syndicate_maintenance_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_syndicate_maintenance_items BEFORE UPDATE ON public.syndicate_maintenance_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_syndicate_capex_forecasts BEFORE UPDATE ON public.syndicate_capex_forecasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_syndicate_budget_items BEFORE UPDATE ON public.syndicate_budget_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_syndicate_votes BEFORE UPDATE ON public.syndicate_votes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
