CREATE TABLE public.appointment_contractor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  recipient_masked text,
  batch_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
  provider_ref text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  first_clicked_at timestamptz,
  click_count int NOT NULL DEFAULT 0,
  response text CHECK (response IN ('accepted','declined','proposed')),
  responded_at timestamptz,
  proposed_slots jsonb,
  decline_reason text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, contractor_id, channel)
);
GRANT SELECT ON public.appointment_contractor_notifications TO authenticated;
GRANT ALL ON public.appointment_contractor_notifications TO service_role;
ALTER TABLE public.appointment_contractor_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read appointment notifications" ON public.appointment_contractor_notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.appointment_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.appointment_contractor_notifications(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('accept','propose','decline')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  clicked_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.appointment_action_tokens TO service_role;
ALTER TABLE public.appointment_action_tokens ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_acn_updated BEFORE UPDATE ON public.appointment_contractor_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();