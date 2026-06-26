CREATE TABLE IF NOT EXISTS public.outreach_health_state (
  id smallint PRIMARY KEY DEFAULT 1,
  resend_verified_domain text,
  resend_last_checked_at timestamptz,
  resend_last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_health_state_singleton CHECK (id = 1)
);

GRANT SELECT ON public.outreach_health_state TO authenticated;
GRANT ALL ON public.outreach_health_state TO service_role;

ALTER TABLE public.outreach_health_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read outreach_health_state"
  ON public.outreach_health_state FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.outreach_health_state (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;