
-- Outbound mailbox validation columns
ALTER TABLE public.outbound_mailboxes
  ADD COLUMN IF NOT EXISTS connection_type text DEFAULT 'smtp',
  ADD COLUMN IF NOT EXISTS auth_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_auth_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_latency_ms integer,
  ADD COLUMN IF NOT EXISTS last_test_error text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_label text;

-- Domain MX/blacklist signals
ALTER TABLE public.email_domain_health
  ADD COLUMN IF NOT EXISTS mx_status text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS mx_records jsonb,
  ADD COLUMN IF NOT EXISTS blacklist_status text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS bounce_ratio_24h numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz;

-- Health check history
CREATE TABLE IF NOT EXISTS public.outbound_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid REFERENCES public.outbound_mailboxes(id) ON DELETE CASCADE,
  check_type text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  response_payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outbound_health_checks_mailbox ON public.outbound_health_checks(mailbox_id, created_at DESC);
ALTER TABLE public.outbound_health_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage outbound_health_checks" ON public.outbound_health_checks;
CREATE POLICY "Admins manage outbound_health_checks"
  ON public.outbound_health_checks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Test send history
CREATE TABLE IF NOT EXISTS public.outbound_test_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid REFERENCES public.outbound_mailboxes(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  subject text,
  status text NOT NULL,
  latency_ms integer,
  provider_response jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outbound_test_sends_mailbox ON public.outbound_test_sends(mailbox_id, created_at DESC);
ALTER TABLE public.outbound_test_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage outbound_test_sends" ON public.outbound_test_sends;
CREATE POLICY "Admins manage outbound_test_sends"
  ON public.outbound_test_sends
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
