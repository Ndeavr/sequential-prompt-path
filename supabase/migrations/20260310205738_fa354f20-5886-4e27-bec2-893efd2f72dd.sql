
CREATE TABLE public.alex_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_type text NOT NULL DEFAULT 'general',
  last_intent text,
  intake_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alex sessions"
ON public.alex_sessions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all alex sessions"
ON public.alex_sessions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_alex_sessions_user ON public.alex_sessions(user_id);
