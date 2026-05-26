
-- ============================================================
-- SMART CONTACT ROUTING — Phase 1 schema
-- ============================================================

-- 1. CONTACTS ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  phone_e164 text,
  phone_type text NOT NULL DEFAULT 'unknown'
    CHECK (phone_type IN ('mobile','landline','voip','unknown')),
  phone_verified boolean NOT NULL DEFAULT false,
  sms_consent boolean NOT NULL DEFAULT false,
  email_consent boolean NOT NULL DEFAULT true,
  preferred_channel text CHECK (preferred_channel IN ('sms','email')),
  last_channel_used text,
  lookup_cached_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone_e164 ON public.contacts(phone_e164);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_phone_e164 ON public.contacts(phone_e164) WHERE phone_e164 IS NOT NULL;

-- 2. OUTBOUND_CONTACT_RULES ----------------------------------
CREATE TABLE IF NOT EXISTS public.outbound_contact_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  priority integer NOT NULL DEFAULT 100,
  condition_type text NOT NULL,
  primary_channel text NOT NULL CHECK (primary_channel IN ('sms','email')),
  fallback_channel text CHECK (fallback_channel IN ('sms','email')),
  delay_before_fallback_minutes integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_rules_priority ON public.outbound_contact_rules(priority) WHERE is_active = true;

-- 3. COMMUNICATION_LOGS --------------------------------------
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('sms','email')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  template_key text,
  delivery_status text NOT NULL DEFAULT 'queued'
    CHECK (delivery_status IN ('queued','sent','delivered','failed','undelivered','bounced','complained')),
  provider text,
  provider_message_id text,
  error_message text,
  idempotency_key text,
  fallback_triggered boolean NOT NULL DEFAULT false,
  parent_log_id uuid REFERENCES public.communication_logs(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_contact ON public.communication_logs(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_logs_status ON public.communication_logs(delivery_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_logs_provider_msg ON public.communication_logs(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_logs_idem ON public.communication_logs(contact_id, template_key, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. COMMUNICATION_FALLBACK_QUEUE ----------------------------
CREATE TABLE IF NOT EXISTS public.communication_fallback_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  parent_log_id uuid NOT NULL REFERENCES public.communication_logs(id) ON DELETE CASCADE,
  fallback_channel text NOT NULL CHECK (fallback_channel IN ('sms','email')),
  template_key text,
  scheduled_for timestamptz NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  cancelled boolean NOT NULL DEFAULT false,
  cancelled_reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_queue_due ON public.communication_fallback_queue(scheduled_for)
  WHERE processed = false AND cancelled = false;

-- 5. updated_at triggers -------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON public.contacts;
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_contact_rules_updated_at ON public.outbound_contact_rules;
CREATE TRIGGER trg_contact_rules_updated_at BEFORE UPDATE ON public.outbound_contact_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. RLS -----------------------------------------------------
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_contact_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_fallback_queue ENABLE ROW LEVEL SECURITY;

-- Admins can read all; nobody else.
DROP POLICY IF EXISTS "admins read contacts" ON public.contacts;
CREATE POLICY "admins read contacts" ON public.contacts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read rules" ON public.outbound_contact_rules;
CREATE POLICY "admins read rules" ON public.outbound_contact_rules
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage rules" ON public.outbound_contact_rules;
CREATE POLICY "admins manage rules" ON public.outbound_contact_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read logs" ON public.communication_logs;
CREATE POLICY "admins read logs" ON public.communication_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read queue" ON public.communication_fallback_queue;
CREATE POLICY "admins read queue" ON public.communication_fallback_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Writes are done by service role only (bypasses RLS). No public write policies.

-- 7. SEED DEFAULT RULES --------------------------------------
INSERT INTO public.outbound_contact_rules (rule_name, priority, condition_type, primary_channel, fallback_channel, delay_before_fallback_minutes, description)
VALUES
  ('mobile_sms_first', 1, 'phone_is_mobile', 'sms', 'email', 60, 'Mobile vérifié + consentement SMS → SMS d''abord, courriel en relais après 60 min.'),
  ('landline_email_first', 2, 'phone_is_landline', 'email', NULL, 0, 'Ligne fixe → courriel uniquement.'),
  ('unknown_phone_email', 3, 'phone_unknown', 'email', NULL, 0, 'Type de téléphone inconnu ou non vérifié → courriel.')
ON CONFLICT (rule_name) DO NOTHING;
