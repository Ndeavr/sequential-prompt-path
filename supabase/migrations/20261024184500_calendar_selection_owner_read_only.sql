-- UNPRO: Google calendar IDs may only be set by the authenticated
-- calendar-google-selection server function after verifying Google access.
-- Prevent browser clients from bypassing that check through direct RLS writes.
-- Service-role / admin policy remains unchanged.
DROP POLICY IF EXISTS "Contractors manage calendar integrations" ON public.booking_calendar_integrations;
DROP POLICY IF EXISTS "Contractors view calendar integrations" ON public.booking_calendar_integrations;
CREATE POLICY "Contractors view calendar integrations"
  ON public.booking_calendar_integrations
  FOR SELECT TO authenticated
  USING (
    contractor_id IN (
      SELECT id FROM public.contractors WHERE user_id = auth.uid()
    )
  );
