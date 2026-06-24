
-- outreach_email_events
CREATE TABLE IF NOT EXISTS public.outreach_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text UNIQUE NOT NULL,
  campaign_id text,
  contractor_id uuid,
  prospect_id uuid,
  recipient text NOT NULL,
  template text,
  subject text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  converted_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oee_recipient ON public.outreach_email_events(recipient);
CREATE INDEX IF NOT EXISTS idx_oee_campaign ON public.outreach_email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_oee_contractor ON public.outreach_email_events(contractor_id);
CREATE INDEX IF NOT EXISTS idx_oee_created ON public.outreach_email_events(created_at DESC);
GRANT SELECT ON public.outreach_email_events TO authenticated;
GRANT ALL ON public.outreach_email_events TO service_role;
ALTER TABLE public.outreach_email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read oee" ON public.outreach_email_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service oee" ON public.outreach_email_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- outreach_sms_events
CREATE TABLE IF NOT EXISTS public.outreach_sms_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid text UNIQUE NOT NULL,
  campaign_id text,
  contractor_id uuid,
  prospect_id uuid,
  recipient text NOT NULL,
  template text,
  body text,
  status text,
  error_code text,
  sent_at timestamptz,
  delivered_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  converted_at timestamptz,
  failed_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ose_recipient ON public.outreach_sms_events(recipient);
CREATE INDEX IF NOT EXISTS idx_ose_campaign ON public.outreach_sms_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ose_created ON public.outreach_sms_events(created_at DESC);
GRANT SELECT ON public.outreach_sms_events TO authenticated;
GRANT ALL ON public.outreach_sms_events TO service_role;
ALTER TABLE public.outreach_sms_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ose" ON public.outreach_sms_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service ose" ON public.outreach_sms_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- cta_links
CREATE TABLE IF NOT EXISTS public.cta_links (
  token text PRIMARY KEY,
  email_id uuid REFERENCES public.outreach_email_events(id) ON DELETE SET NULL,
  sms_id uuid REFERENCES public.outreach_sms_events(id) ON DELETE SET NULL,
  contractor_id uuid,
  campaign_id text,
  destination_url text NOT NULL,
  click_count integer NOT NULL DEFAULT 0,
  first_clicked_at timestamptz,
  last_clicked_at timestamptz,
  last_device text,
  last_ip_hash text,
  last_user_agent text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cta_links_email ON public.cta_links(email_id);
CREATE INDEX IF NOT EXISTS idx_cta_links_contractor ON public.cta_links(contractor_id);
GRANT SELECT ON public.cta_links TO authenticated;
GRANT SELECT ON public.cta_links TO anon;
GRANT ALL ON public.cta_links TO service_role;
ALTER TABLE public.cta_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone resolves cta" ON public.cta_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service cta" ON public.cta_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- acq_e2e_test_runs
CREATE TABLE IF NOT EXISTS public.acq_e2e_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  triggered_by uuid,
  email_recipient text,
  sms_recipient text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  failed_step text,
  duration_ms integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_e2e_runs_created ON public.acq_e2e_test_runs(created_at DESC);
GRANT SELECT ON public.acq_e2e_test_runs TO authenticated;
GRANT ALL ON public.acq_e2e_test_runs TO service_role;
ALTER TABLE public.acq_e2e_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read e2e" ON public.acq_e2e_test_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service e2e" ON public.acq_e2e_test_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- outreach_autopilot_gate
CREATE TABLE IF NOT EXISTS public.outreach_autopilot_gate (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  gated boolean NOT NULL DEFAULT true,
  last_pass_at timestamptz,
  last_test_id uuid REFERENCES public.acq_e2e_test_runs(id) ON DELETE SET NULL,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.outreach_autopilot_gate (id, gated, reason)
  VALUES (1, true, 'Initial gate — run acq-e2e-selftest before resuming outreach.')
  ON CONFLICT (id) DO NOTHING;
GRANT SELECT ON public.outreach_autopilot_gate TO authenticated;
GRANT ALL ON public.outreach_autopilot_gate TO service_role;
ALTER TABLE public.outreach_autopilot_gate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read gate" ON public.outreach_autopilot_gate FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service gate" ON public.outreach_autopilot_gate FOR ALL TO service_role USING (true) WITH CHECK (true);

-- helper: record_email_event
CREATE OR REPLACE FUNCTION public.record_email_event(p_message_id text, p_kind text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_ts timestamptz := COALESCE((p_payload->>'ts')::timestamptz, now());
BEGIN
  INSERT INTO public.outreach_email_events (message_id, recipient, campaign_id, contractor_id, template, subject, metadata, sent_at)
  VALUES (p_message_id, COALESCE(p_payload->>'recipient','unknown'), p_payload->>'campaign_id',
          NULLIF(p_payload->>'contractor_id','')::uuid, p_payload->>'template', p_payload->>'subject', p_payload,
          CASE WHEN p_kind='sent' THEN v_ts END)
  ON CONFLICT (message_id) DO NOTHING;
  UPDATE public.outreach_email_events SET
    sent_at      = CASE WHEN p_kind='sent'      THEN COALESCE(sent_at,v_ts)      ELSE sent_at END,
    delivered_at = CASE WHEN p_kind='delivered' THEN COALESCE(delivered_at,v_ts) ELSE delivered_at END,
    opened_at    = CASE WHEN p_kind='opened'    THEN COALESCE(opened_at,v_ts)    ELSE opened_at END,
    clicked_at   = CASE WHEN p_kind='clicked'   THEN COALESCE(clicked_at,v_ts)   ELSE clicked_at END,
    replied_at   = CASE WHEN p_kind='replied'   THEN COALESCE(replied_at,v_ts)   ELSE replied_at END,
    converted_at = CASE WHEN p_kind='converted' THEN COALESCE(converted_at,v_ts) ELSE converted_at END,
    bounced_at   = CASE WHEN p_kind='bounced'   THEN COALESCE(bounced_at,v_ts)   ELSE bounced_at END,
    complained_at= CASE WHEN p_kind='complained'THEN COALESCE(complained_at,v_ts)ELSE complained_at END,
    last_error   = COALESCE(p_payload->>'error', last_error),
    metadata     = metadata || p_payload,
    updated_at   = now()
  WHERE message_id = p_message_id RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- helper: record_sms_event (writes to outreach_sms_events)
CREATE OR REPLACE FUNCTION public.record_outreach_sms_event(p_sid text, p_kind text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_ts timestamptz := COALESCE((p_payload->>'ts')::timestamptz, now());
BEGIN
  INSERT INTO public.outreach_sms_events (message_sid, recipient, campaign_id, contractor_id, template, body, metadata, sent_at, status)
  VALUES (p_sid, COALESCE(p_payload->>'recipient','unknown'), p_payload->>'campaign_id',
          NULLIF(p_payload->>'contractor_id','')::uuid, p_payload->>'template', p_payload->>'body', p_payload,
          CASE WHEN p_kind='sent' THEN v_ts END, p_payload->>'status')
  ON CONFLICT (message_sid) DO NOTHING;
  UPDATE public.outreach_sms_events SET
    sent_at      = CASE WHEN p_kind='sent'      THEN COALESCE(sent_at,v_ts)      ELSE sent_at END,
    delivered_at = CASE WHEN p_kind='delivered' THEN COALESCE(delivered_at,v_ts) ELSE delivered_at END,
    clicked_at   = CASE WHEN p_kind='clicked'   THEN COALESCE(clicked_at,v_ts)   ELSE clicked_at END,
    replied_at   = CASE WHEN p_kind='replied'   THEN COALESCE(replied_at,v_ts)   ELSE replied_at END,
    converted_at = CASE WHEN p_kind='converted' THEN COALESCE(converted_at,v_ts) ELSE converted_at END,
    failed_at    = CASE WHEN p_kind='failed'    THEN COALESCE(failed_at,v_ts)    ELSE failed_at END,
    status       = COALESCE(p_payload->>'status', status),
    error_code   = COALESCE(p_payload->>'error_code', error_code),
    last_error   = COALESCE(p_payload->>'error', last_error),
    metadata     = metadata || p_payload,
    updated_at   = now()
  WHERE message_sid = p_sid RETURNING id INTO v_id;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.record_email_event(text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_outreach_sms_event(text,text,jsonb) TO service_role;

-- v_outreach_funnel
CREATE OR REPLACE VIEW public.v_outreach_funnel
WITH (security_invoker = true) AS
SELECT COALESCE(campaign_id,'(none)') AS campaign_id, 'email'::text AS channel,
  count(*) FILTER (WHERE sent_at IS NOT NULL) AS sent,
  count(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
  count(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
  count(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked,
  count(*) FILTER (WHERE replied_at IS NOT NULL) AS replied,
  count(*) FILTER (WHERE converted_at IS NOT NULL) AS converted,
  count(*) FILTER (WHERE bounced_at IS NOT NULL) AS bounced
FROM public.outreach_email_events GROUP BY 1
UNION ALL
SELECT COALESCE(campaign_id,'(none)'), 'sms',
  count(*) FILTER (WHERE sent_at IS NOT NULL),
  count(*) FILTER (WHERE delivered_at IS NOT NULL),
  0::bigint,
  count(*) FILTER (WHERE clicked_at IS NOT NULL),
  count(*) FILTER (WHERE replied_at IS NOT NULL),
  count(*) FILTER (WHERE converted_at IS NOT NULL),
  count(*) FILTER (WHERE failed_at IS NOT NULL)
FROM public.outreach_sms_events GROUP BY 1;

GRANT SELECT ON public.v_outreach_funnel TO authenticated;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_oee_touch ON public.outreach_email_events;
CREATE TRIGGER trg_oee_touch BEFORE UPDATE ON public.outreach_email_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_ose_touch ON public.outreach_sms_events;
CREATE TRIGGER trg_ose_touch BEFORE UPDATE ON public.outreach_sms_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_gate_touch ON public.outreach_autopilot_gate;
CREATE TRIGGER trg_gate_touch BEFORE UPDATE ON public.outreach_autopilot_gate
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
