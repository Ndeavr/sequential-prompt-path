
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS is_test_e2e boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_prospects_is_test_e2e ON public.prospects (is_test_e2e) WHERE is_test_e2e = true;

ALTER TABLE public.acq_sms_logs ADD COLUMN IF NOT EXISTS is_test_e2e boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_acq_sms_logs_is_test_e2e ON public.acq_sms_logs (is_test_e2e) WHERE is_test_e2e = true;

CREATE TABLE IF NOT EXISTS public.tunnel_e2e_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  invitation_token text,
  provider_message_id text,
  phone_e164 text NOT NULL,
  first_name text,
  business_name text,
  email text,
  category text,
  city text,
  status text NOT NULL DEFAULT 'sending',
  last_step text,
  sms_error text,
  landing_url text,
  reset_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tunnel_e2e_tests TO authenticated;
GRANT ALL ON public.tunnel_e2e_tests TO service_role;

ALTER TABLE public.tunnel_e2e_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage e2e tests" ON public.tunnel_e2e_tests;
CREATE POLICY "Admins manage e2e tests"
  ON public.tunnel_e2e_tests
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_tunnel_e2e_tests_created_at ON public.tunnel_e2e_tests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tunnel_e2e_tests_status ON public.tunnel_e2e_tests (status);
