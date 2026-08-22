-- ============ Contractor Compatibility Module ============

CREATE TABLE public.contractor_compatibility_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL UNIQUE REFERENCES public.contractors(id) ON DELETE CASCADE,
  trade_pack text NOT NULL DEFAULT 'excavation_fondation',
  status text NOT NULL DEFAULT 'draft',
  completion_pct integer NOT NULL DEFAULT 0,
  current_step integer NOT NULL DEFAULT 1,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  ideal_project_min_cents integer,
  ideal_project_max_cents integer,
  floor_project_cents integer,
  volume_preference text,
  critical_notes text[] NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  last_updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_compatibility_profiles TO authenticated;
GRANT ALL ON public.contractor_compatibility_profiles TO service_role;
ALTER TABLE public.contractor_compatibility_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contractor_service_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  service_slug text NOT NULL,
  service_label_fr text,
  stance text NOT NULL DEFAULT 'accepted',
  min_project_cents integer,
  source text NOT NULL DEFAULT 'declared',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, service_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_service_preferences TO authenticated;
GRANT ALL ON public.contractor_service_preferences TO service_role;
ALTER TABLE public.contractor_service_preferences ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contractor_project_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  dimension text NOT NULL,
  key text NOT NULL,
  label_fr text,
  answer text NOT NULL,
  condition_note text,
  confidence numeric NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'declared',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, dimension, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_project_preferences TO authenticated;
GRANT ALL ON public.contractor_project_preferences TO service_role;
ALTER TABLE public.contractor_project_preferences ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contractor_territory_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.contractor_service_areas(id) ON DELETE SET NULL,
  city_slug text NOT NULL,
  city_name text,
  tier text NOT NULL DEFAULT 'normal',
  min_project_cents integer,
  source text NOT NULL DEFAULT 'declared',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, city_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_territory_preferences TO authenticated;
GRANT ALL ON public.contractor_territory_preferences TO service_role;
ALTER TABLE public.contractor_territory_preferences ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contractor_prequalification_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  criterion text NOT NULL,
  label_fr text,
  level text NOT NULL DEFAULT 'optional',
  source text NOT NULL DEFAULT 'declared',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, criterion)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_prequalification_requirements TO authenticated;
GRANT ALL ON public.contractor_prequalification_requirements TO service_role;
ALTER TABLE public.contractor_prequalification_requirements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contractor_matching_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  rule_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  confirmed_by_contractor boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'declared',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, rule_type, rule_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_matching_rules TO authenticated;
GRANT ALL ON public.contractor_matching_rules TO service_role;
ALTER TABLE public.contractor_matching_rules ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contractor_compatibility_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title_fr text NOT NULL,
  detail_fr text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_change jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'suggested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_compatibility_insights TO authenticated;
GRANT ALL ON public.contractor_compatibility_insights TO service_role;
ALTER TABLE public.contractor_compatibility_insights ENABLE ROW LEVEL SECURITY;

-- Ownership helper (security definer, avoids recursive RLS reads)
CREATE OR REPLACE FUNCTION public.owns_contractor(_contractor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = _contractor_id AND c.user_id = auth.uid()
  );
$$;

-- Policies
DO $policies$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contractor_compatibility_profiles',
    'contractor_service_preferences',
    'contractor_project_preferences',
    'contractor_territory_preferences',
    'contractor_prequalification_requirements',
    'contractor_matching_rules',
    'contractor_compatibility_insights'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.owns_contractor(contractor_id)) WITH CHECK (public.owns_contractor(contractor_id))',
      t || '_owner', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))',
      t || '_admin', t);
    EXECUTE format('CREATE INDEX %I ON public.%I (contractor_id)', 'idx_' || t || '_contractor', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      'trg_' || t || '_updated', t);
  END LOOP;
END
$policies$;

CREATE INDEX idx_ccmr_active ON public.contractor_matching_rules (contractor_id, rule_type) WHERE is_active;
CREATE INDEX idx_ccp_status ON public.contractor_compatibility_profiles (status);