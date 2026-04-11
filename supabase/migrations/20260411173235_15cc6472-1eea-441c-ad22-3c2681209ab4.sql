
-- Add scheduling columns to outbound_campaigns
ALTER TABLE public.outbound_campaigns 
  ADD COLUMN IF NOT EXISTS send_window_start text DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS send_window_end text DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS send_timezone text DEFAULT 'America/Montreal',
  ADD COLUMN IF NOT EXISTS send_days jsonb DEFAULT '["mon","tue","wed","thu","fri"]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_send_enabled boolean DEFAULT false;

-- Create outbound_send_logs to track automated runs
CREATE TABLE IF NOT EXISTS public.outbound_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.outbound_campaigns(id),
  run_at timestamptz NOT NULL DEFAULT now(),
  leads_processed integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_failed integer DEFAULT 0,
  emails_skipped integer DEFAULT 0,
  run_status text DEFAULT 'completed',
  error_message text,
  run_duration_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.outbound_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage send logs" ON public.outbound_send_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
