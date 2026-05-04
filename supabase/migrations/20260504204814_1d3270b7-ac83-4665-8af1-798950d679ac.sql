
-- otp_codes: custom OTP storage (hashed)
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON public.otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Admin-only read for OTP debug; writes via service role only
DROP POLICY IF EXISTS "otp_codes admin read" ON public.otp_codes;
CREATE POLICY "otp_codes admin read" ON public.otp_codes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- otp_rate_limits: per-phone / per-IP throttle
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  key text PRIMARY KEY,
  scope text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 0
);
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limits admin read" ON public.otp_rate_limits;
CREATE POLICY "rate_limits admin read" ON public.otp_rate_limits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Extend existing sms_messages (used by sniper) with traffic-tracking columns
ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS message_sid text,
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS purpose text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_messages_message_sid
  ON public.sms_messages(message_sid)
  WHERE message_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_messages_phone_number ON public.sms_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON public.sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_direction ON public.sms_messages(direction);

-- Admin read for SMS traffic
DROP POLICY IF EXISTS "sms_messages admin read" ON public.sms_messages;
CREATE POLICY "sms_messages admin read" ON public.sms_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- onboarding_status on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'phone_verified';
