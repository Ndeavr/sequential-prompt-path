
CREATE TABLE public.founder_outreach_bcc (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  remaining_email int NOT NULL DEFAULT 5,
  remaining_sms int NOT NULL DEFAULT 5,
  bcc_email text NOT NULL DEFAULT 'yturcotte@gmail.com',
  bcc_phone text NOT NULL DEFAULT '+15142499522',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.founder_outreach_bcc TO service_role;

ALTER TABLE public.founder_outreach_bcc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bcc quota"
  ON public.founder_outreach_bcc FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.founder_outreach_bcc (id, remaining_email, remaining_sms)
VALUES (1, 5, 5)
ON CONFLICT (id) DO UPDATE
  SET remaining_email = 5,
      remaining_sms = 5,
      bcc_email = EXCLUDED.bcc_email,
      bcc_phone = EXCLUDED.bcc_phone,
      updated_at = now();

-- Atomic decrement helpers (SECURITY DEFINER; service_role calls them, but keep tight).
CREATE OR REPLACE FUNCTION public.consume_founder_bcc_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  UPDATE public.founder_outreach_bcc
     SET remaining_email = remaining_email - 1,
         updated_at = now()
   WHERE id = 1 AND remaining_email > 0
   RETURNING bcc_email INTO v_email;
  RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_founder_bcc_sms()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  UPDATE public.founder_outreach_bcc
     SET remaining_sms = remaining_sms - 1,
         updated_at = now()
   WHERE id = 1 AND remaining_sms > 0
   RETURNING bcc_phone INTO v_phone;
  RETURN v_phone;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_founder_bcc_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_founder_bcc_sms() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_founder_bcc_email() TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_founder_bcc_sms() TO service_role;
