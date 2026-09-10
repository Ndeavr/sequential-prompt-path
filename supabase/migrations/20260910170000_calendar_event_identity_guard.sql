-- Calendar conversion events are client-written analytics. Prevent a visitor
-- from attributing an event to another authenticated user id.
DROP POLICY IF EXISTS "anyone_insert_calendar_conversion_events"
  ON public.calendar_conversion_events;

CREATE POLICY "users_insert_own_calendar_conversion_events"
  ON public.calendar_conversion_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL
    OR user_id = auth.uid()
  );
