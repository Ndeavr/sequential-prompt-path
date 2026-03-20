
-- Bloc 9: Notification preferences, scheduled reminders, digests

-- 1. Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'in_app',
  notification_type text NOT NULL DEFAULT 'all',
  is_enabled boolean NOT NULL DEFAULT true,
  phone_number text,
  email_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, channel, notification_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_select_self"
ON public.notification_preferences FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "notif_prefs_insert_self"
ON public.notification_preferences FOR INSERT
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notif_prefs_update_self"
ON public.notification_preferences FOR UPDATE
USING (profile_id = auth.uid());

-- 2. Scheduled reminders
CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  notification_id uuid REFERENCES public.notifications(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sched_rem_status ON public.scheduled_reminders(status, scheduled_for);

ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sched_rem_select_self_or_admin"
ON public.scheduled_reminders FOR SELECT
USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3. SMS tracking on notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sms_sent_at timestamptz;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sms_status text;

-- 4. Notification digests
CREATE TABLE IF NOT EXISTS public.notification_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  digest_type text NOT NULL DEFAULT 'daily',
  notification_ids uuid[] NOT NULL DEFAULT '{}',
  sent_at timestamptz,
  channel text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_digest_select_self_or_admin"
ON public.notification_digests FOR SELECT
USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
