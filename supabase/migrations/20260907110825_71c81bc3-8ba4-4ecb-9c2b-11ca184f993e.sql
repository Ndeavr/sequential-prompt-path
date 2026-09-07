CREATE TABLE IF NOT EXISTS public.contractor_prospect_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL UNIQUE,
  contractor_id uuid,
  user_id uuid NOT NULL,
  token_hash text,
  channel text,
  status text NOT NULL DEFAULT 'activated',
  claimed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contractor_prospect_claims TO authenticated;
GRANT ALL ON public.contractor_prospect_claims TO service_role;

ALTER TABLE public.contractor_prospect_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own activation claim"
ON public.contractor_prospect_claims
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_cpc_user ON public.contractor_prospect_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_cpc_contractor ON public.contractor_prospect_claims(contractor_id);

CREATE TRIGGER update_contractor_prospect_claims_updated_at
BEFORE UPDATE ON public.contractor_prospect_claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_cfe_type_created ON public.contractor_funnel_events(event_type, created_at DESC);