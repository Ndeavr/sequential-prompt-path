DROP POLICY IF EXISTS "Shared user sees own invitations" ON public.property_shares;
CREATE POLICY "Shared user sees own invitations"
  ON public.property_shares FOR SELECT
  TO authenticated
  USING (
    shared_with_user_id = auth.uid()
    OR lower(shared_with_email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Shared users can read property" ON public.properties;
CREATE POLICY "Shared users can read property"
  ON public.properties FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.property_shares ps
      WHERE ps.property_id = properties.id
        AND ps.status = 'accepted'
        AND ps.shared_with_user_id = auth.uid()
    )
  );