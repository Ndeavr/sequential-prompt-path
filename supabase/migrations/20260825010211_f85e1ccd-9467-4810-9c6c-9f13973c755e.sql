ALTER TABLE public.ai_recommendation_audits
  ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS invite_token text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ai_recommendation_audits_invite_token_key
  ON public.ai_recommendation_audits (invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_recommendation_audits_affiliate_idx
  ON public.ai_recommendation_audits (affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_recommendation_audits_lead_idx
  ON public.ai_recommendation_audits (lead_id);

CREATE TABLE IF NOT EXISTS public.affiliate_prospect_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_prospect_locks_lead_key
  ON public.affiliate_prospect_locks (lead_id);
CREATE INDEX IF NOT EXISTS affiliate_prospect_locks_affiliate_idx
  ON public.affiliate_prospect_locks (affiliate_id, expires_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_prospect_locks TO authenticated;
GRANT ALL ON public.affiliate_prospect_locks TO service_role;

ALTER TABLE public.affiliate_prospect_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate manages own locks" ON public.affiliate_prospect_locks;
CREATE POLICY "affiliate manages own locks"
  ON public.affiliate_prospect_locks
  FOR ALL
  TO authenticated
  USING (public.is_affiliate_owner(affiliate_id) OR public.is_admin())
  WITH CHECK (public.is_affiliate_owner(affiliate_id) OR public.is_admin());

CREATE TRIGGER affiliate_prospect_locks_touch
  BEFORE UPDATE ON public.affiliate_prospect_locks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();