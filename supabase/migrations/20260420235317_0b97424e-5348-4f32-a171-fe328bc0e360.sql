CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON public.system_events (event_type);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view system events" ON public.system_events;
CREATE POLICY "Admins can view system events"
ON public.system_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can create system events" ON public.system_events;
CREATE POLICY "Admins can create system events"
ON public.system_events
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT ON public.system_events TO authenticated;