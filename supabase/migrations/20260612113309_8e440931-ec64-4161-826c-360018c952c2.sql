CREATE TABLE IF NOT EXISTS public.auth_otp_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_attempts_identifier_created
  ON public.auth_otp_attempts (identifier, created_at DESC);

GRANT ALL ON public.auth_otp_attempts TO service_role;

ALTER TABLE public.auth_otp_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access"
  ON public.auth_otp_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);