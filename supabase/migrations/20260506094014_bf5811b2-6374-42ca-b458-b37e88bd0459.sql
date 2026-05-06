
-- form_submissions
CREATE TABLE public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  reference_code text UNIQUE,
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  ip_address text,
  user_agent text,
  email_user_sent boolean NOT NULL DEFAULT false,
  email_admin_sent boolean NOT NULL DEFAULT false,
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX idx_form_submissions_form_type ON public.form_submissions(form_type);
CREATE INDEX idx_form_submissions_created_at ON public.form_submissions(created_at DESC);
CREATE INDEX idx_form_submissions_email ON public.form_submissions(email);

-- form_email_logs
CREATE TABLE public.form_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  recipient text NOT NULL,
  provider text,
  status text NOT NULL,
  response jsonb,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_form_email_logs_submission ON public.form_email_logs(submission_id);

-- form_events
CREATE TABLE public.form_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_form_events_submission ON public.form_events(submission_id);

-- reference code generator
CREATE OR REPLACE FUNCTION public.generate_form_reference_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text;
  rand text;
BEGIN
  IF NEW.reference_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  prefix := upper(substring(regexp_replace(coalesce(NEW.form_type,'frm'), '[^a-zA-Z]', '', 'g') from 1 for 4));
  rand := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
  NEW.reference_code := 'UNP-' || prefix || '-' || rand;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_form_submissions_refcode
  BEFORE INSERT ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.generate_form_reference_code();

-- updated_at trigger (reuse existing helper if present)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_form_submissions_updated
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_events ENABLE ROW LEVEL SECURITY;

-- Public can insert form submissions and events (anonymous forms)
CREATE POLICY "Anyone can submit a form"
  ON public.form_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can log form events"
  ON public.form_events FOR INSERT
  WITH CHECK (true);

-- Admins can read everything
CREATE POLICY "Admins read submissions"
  ON public.form_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update submissions"
  ON public.form_submissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read email logs"
  ON public.form_email_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read form events"
  ON public.form_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
