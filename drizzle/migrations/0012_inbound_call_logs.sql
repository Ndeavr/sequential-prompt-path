CREATE TABLE public.inbound_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid text NOT NULL UNIQUE,
  from_number text,
  to_number text,
  destination_masked text,
  dial_status text NOT NULL DEFAULT 'initiated',
  dial_duration_s integer,
  matched_prospect_count integer NOT NULL DEFAULT 0,
  matched_prospect_id uuid,
  needs_callback boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'twilio_voice_inbound',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inbound_call_logs TO authenticated;
GRANT ALL ON public.inbound_call_logs TO service_role;
ALTER TABLE public.inbound_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read inbound calls" ON public.inbound_call_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));