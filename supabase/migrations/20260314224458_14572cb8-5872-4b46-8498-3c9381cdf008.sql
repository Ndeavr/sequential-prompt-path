
CREATE TABLE public.cta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cta_text text NOT NULL,
  intent text NOT NULL,
  page text NOT NULL,
  user_role text,
  user_id uuid,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anonymous tracking)
CREATE POLICY "Anyone can insert cta_events"
  ON public.cta_events FOR INSERT
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read cta_events"
  ON public.cta_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_cta_events_intent ON public.cta_events(intent);
CREATE INDEX idx_cta_events_created ON public.cta_events(created_at);
