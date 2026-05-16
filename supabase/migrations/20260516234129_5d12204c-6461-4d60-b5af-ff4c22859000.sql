CREATE TABLE IF NOT EXISTS public.voice_health_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('success','failure')),
  voice_id text,
  surface text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_health_pings_kind_created_idx
  ON public.voice_health_pings (kind, created_at DESC);

ALTER TABLE public.voice_health_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert voice health pings"
  ON public.voice_health_pings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can read voice health pings"
  ON public.voice_health_pings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));