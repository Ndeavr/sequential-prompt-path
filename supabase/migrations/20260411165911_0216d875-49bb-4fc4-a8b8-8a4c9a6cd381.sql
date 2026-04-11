
CREATE TABLE public.paywall_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  syndicate_id uuid REFERENCES public.syndicates(id) ON DELETE SET NULL,
  trigger_type text NOT NULL,
  trigger_context jsonb DEFAULT '{}',
  converted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own paywall events"
  ON public.paywall_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON public.paywall_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
