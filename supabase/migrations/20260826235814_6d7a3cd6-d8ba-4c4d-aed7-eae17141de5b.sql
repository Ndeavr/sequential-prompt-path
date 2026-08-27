CREATE TABLE IF NOT EXISTS public.contractor_matching_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL UNIQUE,
  contractor_id uuid,
  prospect_id uuid,
  audit_id uuid,
  audit_token text,
  activation_token text,
  affiliate_ref text,
  business_name text,
  city text,
  trade text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_matching_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_completion integer NOT NULL DEFAULT 0,
  ai_profile_readiness integer NOT NULL DEFAULT 0,
  recommendation_eligible boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'unverified',
  chatgpt_integration_status text NOT NULL DEFAULT 'not_submitted',
  status text NOT NULL DEFAULT 'in_progress',
  completed_at timestamptz,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cmp_contractor ON public.contractor_matching_profiles(contractor_id);
CREATE INDEX IF NOT EXISTS idx_cmp_prospect ON public.contractor_matching_profiles(prospect_id);
CREATE INDEX IF NOT EXISTS idx_cmp_status ON public.contractor_matching_profiles(status, updated_at DESC);

REVOKE ALL ON public.contractor_matching_profiles FROM anon;
GRANT SELECT ON public.contractor_matching_profiles TO authenticated;
GRANT ALL ON public.contractor_matching_profiles TO service_role;

ALTER TABLE public.contractor_matching_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors read their own matching profile"
ON public.contractor_matching_profiles
FOR SELECT TO authenticated
USING (
  contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER trg_cmp_updated_at
BEFORE UPDATE ON public.contractor_matching_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();