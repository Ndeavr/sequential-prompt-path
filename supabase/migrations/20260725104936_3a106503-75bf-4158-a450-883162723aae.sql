
ALTER TABLE public.verified_contractor_prospects
  ADD COLUMN IF NOT EXISTS channel_used TEXT,
  ADD COLUMN IF NOT EXISTS sms_provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS sms_error_code TEXT,
  ADD COLUMN IF NOT EXISTS sms_error_message TEXT,
  ADD COLUMN IF NOT EXISTS email_provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS email_error_message TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fallback_reason TEXT,
  ADD COLUMN IF NOT EXISTS fallback_timestamp TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vcp_delivery_status
  ON public.verified_contractor_prospects (delivery_status)
  WHERE delivery_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vcp_channel_used
  ON public.verified_contractor_prospects (channel_used)
  WHERE channel_used IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vcp_last_attempt_at
  ON public.verified_contractor_prospects (last_attempt_at DESC NULLS LAST);
