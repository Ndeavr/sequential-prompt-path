ALTER TABLE public.verified_prospect_tokens
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text,
  ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by uuid;

CREATE TABLE IF NOT EXISTS public.contractor_invite_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  token_hash text,
  token_prefix text,
  prospect_id uuid,
  contractor_id uuid,
  user_id uuid,
  outcome text NOT NULL DEFAULT 'ok',
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contractor_invite_events TO authenticated;
GRANT ALL ON public.contractor_invite_events TO service_role;

ALTER TABLE public.contractor_invite_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read invite events"
  ON public.contractor_invite_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_invite_events_created_at ON public.contractor_invite_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invite_events_prospect ON public.contractor_invite_events (prospect_id);
CREATE INDEX IF NOT EXISTS idx_invite_events_token ON public.contractor_invite_events (token_hash);