-- Rencontres avec le fondateur réservées depuis /commission (agenda principal du fondateur).
-- Écriture par la fonction serveur founder-meeting uniquement (service role); lecture admin.
CREATE TABLE public.founder_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_start timestamptz NOT NULL,
  slot_end timestamptz NOT NULL,
  topic text NOT NULL CHECK (topic IN ('commission', 'partnership')),
  status text NOT NULL DEFAULT 'holding'
    CHECK (status IN ('holding', 'confirmed', 'calendar_unknown', 'conflict', 'calendar_failed', 'cancelled')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  domain_territory text,
  message text,
  locale text NOT NULL DEFAULT 'fr',
  privacy_consent boolean NOT NULL,
  consent_text text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  ip_hash text,
  google_event_id text,
  failure_reason text,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (slot_end - slot_start = interval '90 minutes'),
  CHECK (privacy_consent = true)
);

-- Un seul rendez-vous actif par créneau : bloque les doubles réservations concurrentes.
CREATE UNIQUE INDEX founder_meetings_one_active_per_slot
  ON public.founder_meetings (slot_start)
  WHERE status IN ('holding', 'confirmed', 'calendar_unknown');
CREATE INDEX founder_meetings_ip_recent ON public.founder_meetings (ip_hash, created_at);
CREATE INDEX founder_meetings_email_active ON public.founder_meetings (lower(email), slot_start)
  WHERE status IN ('holding', 'confirmed', 'calendar_unknown');

GRANT SELECT, UPDATE ON public.founder_meetings TO authenticated;
GRANT ALL ON public.founder_meetings TO service_role;

ALTER TABLE public.founder_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read founder meetings" ON public.founder_meetings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update founder meetings" ON public.founder_meetings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.founder_meetings_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER founder_meetings_touch BEFORE UPDATE ON public.founder_meetings
  FOR EACH ROW EXECUTE FUNCTION public.founder_meetings_touch();