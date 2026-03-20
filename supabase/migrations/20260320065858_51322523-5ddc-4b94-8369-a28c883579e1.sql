
-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  channel text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'unread',
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_self_or_admin"
ON public.notifications FOR SELECT
USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "notifications_update_self"
ON public.notifications FOR UPDATE
USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- En route column on appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS contractor_en_route_at timestamptz;
