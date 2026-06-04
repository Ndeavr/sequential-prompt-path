
CREATE TABLE public.outreach_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.agent_outreach_messages(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('sms','email')),
  provider text,
  recipient_raw text,
  recipient_normalized text,
  message_body text,
  status text NOT NULL CHECK (status IN ('queued','sent','failed','blocked','skipped')),
  error_code text,
  error_message text,
  provider_message_id text,
  attempt int NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

GRANT SELECT ON public.outreach_delivery_logs TO authenticated;
GRANT ALL ON public.outreach_delivery_logs TO service_role;

ALTER TABLE public.outreach_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read delivery logs"
  ON public.outreach_delivery_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Service writes delivery logs"
  ON public.outreach_delivery_logs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_odl_created ON public.outreach_delivery_logs (created_at DESC);
CREATE INDEX idx_odl_status ON public.outreach_delivery_logs (status, created_at DESC);
CREATE INDEX idx_odl_lead ON public.outreach_delivery_logs (lead_id);
