
-- Trial fields
ALTER TABLE public.acq_subscriptions
  ADD COLUMN IF NOT EXISTS auto_upgrade boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS upgrade_plan_code text,
  ADD COLUMN IF NOT EXISTS payment_method_on_file boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS upgrade_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS upgrade_failed_reason text,
  ADD COLUMN IF NOT EXISTS warned_at timestamptz;

-- Territory slots
CREATE TABLE IF NOT EXISTS public.acq_territory_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  trade text NOT NULL,
  max_slots int NOT NULL DEFAULT 3,
  used_slots int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city, trade)
);
ALTER TABLE public.acq_territory_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read territory slots" ON public.acq_territory_slots
  FOR SELECT USING (true);
CREATE POLICY "Admins manage territory slots" ON public.acq_territory_slots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Email sequences (templates)
CREATE TABLE IF NOT EXISTS public.acq_email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  day_offset int NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.acq_email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email sequences" ON public.acq_email_sequences
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Email logs
CREATE TABLE IF NOT EXISTS public.acq_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.acq_contractors(id) ON DELETE CASCADE,
  sequence_code text,
  recipient_email text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error text,
  opened_at timestamptz,
  clicked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.acq_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email logs" ON public.acq_email_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_acq_email_logs_contractor ON public.acq_email_logs(contractor_id);

-- SMS logs
CREATE TABLE IF NOT EXISTS public.acq_sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.acq_contractors(id) ON DELETE CASCADE,
  recipient_phone text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.acq_sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sms logs" ON public.acq_sms_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed slots (idempotent)
INSERT INTO public.acq_territory_slots (city, trade, max_slots, used_slots) VALUES
  ('Laval', 'roofing', 3, 0),
  ('Laval', 'isolation', 3, 0),
  ('Montréal', 'roofing', 5, 0),
  ('Montréal', 'isolation', 5, 0)
ON CONFLICT (city, trade) DO NOTHING;

-- Seed email sequences
INSERT INTO public.acq_email_sequences (code, day_offset, subject, body_html) VALUES
  ('day_0', 0, 'Votre profil UNPRO est prêt',
    '<p>Bonjour,</p><p>Votre profil UNPRO est en ligne et prêt à recevoir des opportunités. Accédez-y maintenant.</p>'),
  ('day_1', 1, 'Il vous reste des places dans votre secteur',
    '<p>Les places se remplissent rapidement dans votre territoire. Activez aujourd''hui pour 1$.</p>'),
  ('day_3', 3, 'Des clients recherchent déjà ce service',
    '<p>Plusieurs demandes ont été reçues dans votre catégorie cette semaine. Activez votre profil pour les recevoir.</p>'),
  ('day_6', 6, 'Votre activation se termine bientôt',
    '<p>Dernière chance pour activer votre profil au tarif promotionnel de 1$.</p>')
ON CONFLICT (code) DO NOTHING;

-- Helper RPC: increment slot
CREATE OR REPLACE FUNCTION public.acq_increment_slot(p_city text, p_trade text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int;
  v_used int;
BEGIN
  SELECT max_slots, used_slots INTO v_max, v_used
  FROM public.acq_territory_slots
  WHERE lower(city) = lower(p_city) AND lower(trade) = lower(p_trade)
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.acq_territory_slots (city, trade, max_slots, used_slots)
    VALUES (p_city, p_trade, 3, 1);
    RETURN true;
  END IF;

  IF v_used >= v_max THEN
    RETURN false;
  END IF;

  UPDATE public.acq_territory_slots
  SET used_slots = used_slots + 1, updated_at = now()
  WHERE lower(city) = lower(p_city) AND lower(trade) = lower(p_trade);
  RETURN true;
END;
$$;
