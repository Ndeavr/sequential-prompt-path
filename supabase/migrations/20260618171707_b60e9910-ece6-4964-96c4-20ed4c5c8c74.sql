
CREATE TABLE public.contractor_curiosity_sms_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospect_pages(id) ON DELETE CASCADE,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_step int NOT NULL DEFAULT 0,
  next_send_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  unsubscribed_at timestamptz,
  enrolled_by uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccss_status_chk CHECK (status IN ('active','paused','completed','stopped','failed')),
  CONSTRAINT ccss_step_chk CHECK (current_step BETWEEN 0 AND 12)
);
CREATE INDEX ccss_due_idx ON public.contractor_curiosity_sms_sequences (status, next_send_at) WHERE status = 'active';
CREATE INDEX ccss_prospect_idx ON public.contractor_curiosity_sms_sequences (prospect_id);
CREATE UNIQUE INDEX ccss_unique_active ON public.contractor_curiosity_sms_sequences (prospect_id) WHERE status IN ('active','paused');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_curiosity_sms_sequences TO authenticated;
GRANT ALL ON public.contractor_curiosity_sms_sequences TO service_role;
ALTER TABLE public.contractor_curiosity_sms_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccss_admin_all" ON public.contractor_curiosity_sms_sequences
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ccss_service_all" ON public.contractor_curiosity_sms_sequences
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE public.contractor_curiosity_sms_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.contractor_curiosity_sms_sequences(id) ON DELETE CASCADE,
  step int NOT NULL,
  template_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  twilio_sid text,
  error text,
  rendered_body text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccse_step_chk CHECK (step BETWEEN 1 AND 12),
  CONSTRAINT ccse_status_chk CHECK (status IN ('queued','sent','failed','skipped_stop','skipped_window'))
);
CREATE UNIQUE INDEX ccse_unique_step ON public.contractor_curiosity_sms_events (sequence_id, step);
CREATE INDEX ccse_seq_idx ON public.contractor_curiosity_sms_events (sequence_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_curiosity_sms_events TO authenticated;
GRANT ALL ON public.contractor_curiosity_sms_events TO service_role;
ALTER TABLE public.contractor_curiosity_sms_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccse_admin_all" ON public.contractor_curiosity_sms_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ccse_service_all" ON public.contractor_curiosity_sms_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_ccss_updated_at
  BEFORE UPDATE ON public.contractor_curiosity_sms_sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();
