
-- Founder invites table
CREATE TABLE public.founder_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_user_id uuid NOT NULL,
  referral_code text NOT NULL UNIQUE,
  access_pin text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  max_uses integer NOT NULL DEFAULT 5,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Access logs
CREATE TABLE public.founder_invite_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_invite_id uuid NOT NULL REFERENCES public.founder_invites(id) ON DELETE CASCADE,
  entered_pin text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_founder_invites_referral_code ON public.founder_invites(referral_code);
CREATE INDEX idx_founder_invites_ambassador ON public.founder_invites(ambassador_user_id);
CREATE INDEX idx_founder_invite_logs_invite ON public.founder_invite_access_logs(founder_invite_id);

-- RLS
ALTER TABLE public.founder_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_invite_access_logs ENABLE ROW LEVEL SECURITY;

-- Ambassadors can see their own invites
CREATE POLICY "Users can view own invites"
  ON public.founder_invites FOR SELECT
  TO authenticated
  USING (ambassador_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Ambassadors can insert invites
CREATE POLICY "Users can create invites"
  ON public.founder_invites FOR INSERT
  TO authenticated
  WITH CHECK (ambassador_user_id = auth.uid());

-- Admins can update invites
CREATE POLICY "Admins can update invites"
  ON public.founder_invites FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR ambassador_user_id = auth.uid());

-- Access logs: insert allowed for anyone (edge function inserts via service role)
CREATE POLICY "Service can insert logs"
  ON public.founder_invite_access_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins and invite owners can view logs
CREATE POLICY "Owners and admins can view logs"
  ON public.founder_invite_access_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.founder_invites fi
      WHERE fi.id = founder_invite_id AND fi.ambassador_user_id = auth.uid()
    )
  );
