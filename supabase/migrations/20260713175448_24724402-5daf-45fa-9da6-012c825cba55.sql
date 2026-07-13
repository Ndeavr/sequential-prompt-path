
ALTER TABLE public.acq_sms_logs
  ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prospect_id uuid,
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS outreach_message_id uuid,
  ADD COLUMN IF NOT EXISTS invitation_token text,
  ADD COLUMN IF NOT EXISTS relance_kind text;

CREATE INDEX IF NOT EXISTS idx_acq_sms_logs_sim_status_created
  ON public.acq_sms_logs (is_simulation, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_acq_sms_logs_prospect
  ON public.acq_sms_logs (prospect_id);
