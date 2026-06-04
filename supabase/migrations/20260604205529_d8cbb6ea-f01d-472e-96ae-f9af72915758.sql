
-- 1) Settings singleton (Founder Mode + per-channel defaults)
CREATE TABLE public.outreach_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  founder_override boolean NOT NULL DEFAULT false,
  sms_daily_limit integer NOT NULL DEFAULT 50,
  email_daily_limit integer NOT NULL DEFAULT 25,
  activation_daily_limit integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.outreach_settings TO authenticated;
GRANT ALL ON public.outreach_settings TO service_role;
ALTER TABLE public.outreach_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read settings" ON public.outreach_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write settings" ON public.outreach_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.outreach_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- 2) Inbound replies
CREATE TABLE public.outreach_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.contractor_leads(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'sms',
  provider text,
  provider_message_id text,
  from_address text,
  body text,
  intent text,
  processed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outreach_replies_lead_idx ON public.outreach_replies(lead_id, created_at DESC);
GRANT SELECT ON public.outreach_replies TO authenticated;
GRANT ALL ON public.outreach_replies TO service_role;
ALTER TABLE public.outreach_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read replies" ON public.outreach_replies
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3) Activation sessions (reply → checkout → paid)
CREATE TABLE public.activation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.outreach_replies(id) ON DELETE SET NULL,
  intent text,
  intent_confidence numeric,
  recommended_plan text,
  checkout_url text,
  checkout_session_id text,
  status text NOT NULL DEFAULT 'created',
  paid_at timestamptz,
  activated_at timestamptz,
  amount_paid_cents integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activation_sessions_lead_idx ON public.activation_sessions(lead_id);
CREATE INDEX activation_sessions_status_idx ON public.activation_sessions(status);
GRANT SELECT ON public.activation_sessions TO authenticated;
GRANT ALL ON public.activation_sessions TO service_role;
ALTER TABLE public.activation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read activations" ON public.activation_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4) Retry support on outreach queue
ALTER TABLE public.agent_outreach_messages
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_reason text;

-- 5) Conversion funnel status on leads
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS pipeline_status text;

-- 6) Helper: bump funnel status only forward
CREATE OR REPLACE FUNCTION public.set_lead_pipeline_status(p_lead_id uuid, p_status text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.contractor_leads SET pipeline_status = p_status, updated_at = now()
   WHERE id = p_lead_id;
$$;
