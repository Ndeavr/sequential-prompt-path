
CREATE TABLE public.agent_outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms','email','voice')),
  variant text NOT NULL DEFAULT 'v1',
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','replied','clicked')),
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  activation_clicked boolean NOT NULL DEFAULT false,
  activation_completed boolean NOT NULL DEFAULT false,
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aom_lead ON public.agent_outreach_messages(lead_id, created_at DESC);
CREATE INDEX idx_aom_pending ON public.agent_outreach_messages(status, scheduled_at) WHERE status = 'pending';

GRANT SELECT ON public.agent_outreach_messages TO authenticated;
GRANT ALL ON public.agent_outreach_messages TO service_role;

ALTER TABLE public.agent_outreach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read agent_outreach" ON public.agent_outreach_messages FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage agent_outreach" ON public.agent_outreach_messages FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Service writes agent_outreach" ON public.agent_outreach_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
