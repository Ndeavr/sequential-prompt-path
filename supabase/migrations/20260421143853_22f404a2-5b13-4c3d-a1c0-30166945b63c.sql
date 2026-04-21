
ALTER TABLE public.contractors_prospects
  ADD COLUMN IF NOT EXISTS sms_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_message_sid text,
  ADD COLUMN IF NOT EXISTS sms_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sms_replied boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_reply_text text,
  ADD COLUMN IF NOT EXISTS sms_booked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_opted_out boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_attempt_count integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_prospects_sms_status ON public.contractors_prospects(sms_status);
CREATE INDEX IF NOT EXISTS idx_prospects_sms_sent_at ON public.contractors_prospects(sms_sent_at);
