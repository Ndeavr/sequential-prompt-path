
-- Property sharing / co-owner invitations
CREATE TABLE public.property_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(property_id, shared_with_email)
);

ALTER TABLE public.property_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage shares
CREATE POLICY "Owner manages shares"
  ON public.property_shares FOR ALL
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Shared user can see their own invitations
CREATE POLICY "Shared user sees own invitations"
  ON public.property_shares FOR SELECT
  TO authenticated
  USING (shared_with_user_id = auth.uid() OR shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow shared users to read the property
CREATE POLICY "Shared users can read property"
  ON public.properties FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.property_shares ps
      WHERE ps.property_id = id
        AND ps.status = 'accepted'
        AND (ps.shared_with_user_id = auth.uid())
    )
  );
