
-- =========================
-- EMAIL TEMPLATES
-- =========================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  template_name text NOT NULL,
  audience_type text,
  category text DEFAULT 'transactional',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  variant_type text NOT NULL DEFAULT 'standard',
  subject_template text NOT NULL,
  preheader_template text,
  cta_primary_label text,
  cta_primary_url_template text,
  cta_secondary_label text,
  cta_secondary_url_template text,
  is_active boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_template_versions_template_id
  ON public.email_template_versions(template_id);

CREATE TABLE IF NOT EXISTS public.email_template_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id uuid NOT NULL REFERENCES public.email_template_versions(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT current_date,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  open_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  completion_count integer NOT NULL DEFAULT 0,
  recovery_count integer NOT NULL DEFAULT 0,
  payment_recovery_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_version_id, metric_date)
);

-- =========================
-- EMAIL AUTOMATION RULES
-- =========================
CREATE TABLE IF NOT EXISTS public.email_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  trigger_event text NOT NULL,
  template_key text NOT NULL,
  sender_email text NOT NULL,
  audience_type text,
  status text NOT NULL DEFAULT 'active',
  delay_minutes integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  conditions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- SMS TEMPLATES
-- =========================
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  template_name text NOT NULL,
  body_template text NOT NULL,
  audience_type text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- SMS RULES
-- =========================
CREATE TABLE IF NOT EXISTS public.sms_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  trigger_event text NOT NULL,
  template_key text NOT NULL,
  audience_type text,
  status text NOT NULL DEFAULT 'active',
  delay_minutes integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  cooldown_minutes integer NOT NULL DEFAULT 120,
  conditions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- SMS EVENT QUEUE
-- =========================
CREATE TABLE IF NOT EXISTS public.sms_event_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  recipient_phone text NOT NULL,
  template_key text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  queue_status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error_message text,
  cooldown_key text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_event_queue_status_scheduled
  ON public.sms_event_queue(queue_status, scheduled_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_event_queue_idempotency
  ON public.sms_event_queue(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- =========================
-- SMS EVENTS
-- =========================
CREATE TABLE IF NOT EXISTS public.sms_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL DEFAULT 'twilio',
  event_key text,
  recipient_phone text NOT NULL,
  template_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_events_status ON public.sms_events(status);

-- =========================
-- UPDATED_AT TRIGGERS
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at_generic()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

DROP TRIGGER IF EXISTS trg_email_template_versions_updated_at ON public.email_template_versions;
CREATE TRIGGER trg_email_template_versions_updated_at BEFORE UPDATE ON public.email_template_versions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

DROP TRIGGER IF EXISTS trg_email_automation_rules_updated_at ON public.email_automation_rules;
CREATE TRIGGER trg_email_automation_rules_updated_at BEFORE UPDATE ON public.email_automation_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

DROP TRIGGER IF EXISTS trg_sms_templates_updated_at ON public.sms_templates;
CREATE TRIGGER trg_sms_templates_updated_at BEFORE UPDATE ON public.sms_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

DROP TRIGGER IF EXISTS trg_sms_automation_rules_updated_at ON public.sms_automation_rules;
CREATE TRIGGER trg_sms_automation_rules_updated_at BEFORE UPDATE ON public.sms_automation_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

DROP TRIGGER IF EXISTS trg_sms_event_queue_updated_at ON public.sms_event_queue;
CREATE TRIGGER trg_sms_event_queue_updated_at BEFORE UPDATE ON public.sms_event_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

-- =========================
-- RLS
-- =========================
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_event_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_events ENABLE ROW LEVEL SECURITY;

-- Admin read policies (using has_role)
CREATE POLICY "admin_read_email_templates" ON public.email_templates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_read_email_template_versions" ON public.email_template_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_read_email_template_metrics" ON public.email_template_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_read_email_automation_rules" ON public.email_automation_rules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_read_sms_templates" ON public.sms_templates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_read_sms_automation_rules" ON public.sms_automation_rules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_read_sms_event_queue" ON public.sms_event_queue FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_read_sms_events" ON public.sms_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Service role full access
CREATE POLICY "service_role_email_templates_all" ON public.email_templates FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_email_template_versions_all" ON public.email_template_versions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_email_template_metrics_all" ON public.email_template_metrics FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_email_rules_all" ON public.email_automation_rules FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_sms_templates_all" ON public.sms_templates FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_sms_rules_all" ON public.sms_automation_rules FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_sms_queue_all" ON public.sms_event_queue FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_sms_events_all" ON public.sms_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
