ALTER TABLE public.outreach_health_state
  ADD COLUMN IF NOT EXISTS resend_key_prefix text,
  ADD COLUMN IF NOT EXISTS resend_key_length int,
  ADD COLUMN IF NOT EXISTS resend_account_id text,
  ADD COLUMN IF NOT EXISTS resend_last_send_status text,
  ADD COLUMN IF NOT EXISTS resend_last_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS resend_last_send_id text,
  ADD COLUMN IF NOT EXISTS resend_last_send_error text;