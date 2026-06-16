
-- 1. Lead-level columns
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sms_status text;

-- 2. Global pause flag
ALTER TABLE public.outbound_global_settings
  ADD COLUMN IF NOT EXISTS outreach_paused boolean NOT NULL DEFAULT false;

-- 3. onboarding_sequences
CREATE TABLE IF NOT EXISTS public.onboarding_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_lead_id uuid NOT NULL REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','waiting','completed_paid','completed_unsubscribed','failed','paused')),
  current_step smallint NOT NULL DEFAULT 0,
  next_send_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  stopped_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.onboarding_sequences TO authenticated;
GRANT ALL ON public.onboarding_sequences TO service_role;

ALTER TABLE public.onboarding_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read onboarding sequences" ON public.onboarding_sequences;
CREATE POLICY "Admins read onboarding sequences"
  ON public.onboarding_sequences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service manages onboarding sequences" ON public.onboarding_sequences;
CREATE POLICY "Service manages onboarding sequences"
  ON public.onboarding_sequences FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_onboarding_sequences_due
  ON public.onboarding_sequences (status, next_send_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_onboarding_sequences_lead
  ON public.onboarding_sequences (contractor_lead_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_sequences_active_lead
  ON public.onboarding_sequences (contractor_lead_id)
  WHERE status IN ('active','waiting','paused');

-- 4. contractor_onboarding_messages  (separate from the legacy email-focused outbound_messages)
CREATE TABLE IF NOT EXISTS public.contractor_onboarding_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_lead_id uuid REFERENCES public.contractor_leads(id) ON DELETE SET NULL,
  sequence_id uuid REFERENCES public.onboarding_sequences(id) ON DELETE SET NULL,
  step smallint,
  channel text NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms','email')),
  to_phone text,
  body text NOT NULL,
  body_hash text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sending','sent','delivered','failed','undelivered','skipped')),
  twilio_message_sid text,
  error_message text,
  skip_reason text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contractor_onboarding_messages TO authenticated;
GRANT ALL ON public.contractor_onboarding_messages TO service_role;

ALTER TABLE public.contractor_onboarding_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read contractor onboarding messages" ON public.contractor_onboarding_messages;
CREATE POLICY "Admins read contractor onboarding messages"
  ON public.contractor_onboarding_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service manages contractor onboarding messages" ON public.contractor_onboarding_messages;
CREATE POLICY "Service manages contractor onboarding messages"
  ON public.contractor_onboarding_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_com_lead ON public.contractor_onboarding_messages (contractor_lead_id);
CREATE INDEX IF NOT EXISTS idx_com_sid ON public.contractor_onboarding_messages (twilio_message_sid);
CREATE INDEX IF NOT EXISTS idx_com_status_sent ON public.contractor_onboarding_messages (status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_com_dedupe
  ON public.contractor_onboarding_messages (to_phone, body_hash, sent_at DESC);

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_sequences_touch ON public.onboarding_sequences;
CREATE TRIGGER trg_onboarding_sequences_touch
  BEFORE UPDATE ON public.onboarding_sequences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Auto-enroll trigger
CREATE OR REPLACE FUNCTION public.enroll_contractor_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_clean text;
  has_active boolean;
BEGIN
  IF NEW.pipeline_status IS DISTINCT FROM 'ready_for_outreach' THEN
    RETURN NEW;
  END IF;

  IF NEW.paid_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.unsubscribed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  phone_clean := regexp_replace(COALESCE(NEW.mobile_phone, NEW.phone, ''), '\D', '', 'g');
  IF length(phone_clean) < 10 THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.onboarding_sequences
    WHERE contractor_lead_id = NEW.id
      AND status IN ('active','waiting','paused')
  ) INTO has_active;
  IF has_active THEN
    RETURN NEW;
  END IF;

  IF NEW.onboarding_token IS NULL THEN
    UPDATE public.contractor_leads
       SET onboarding_token = encode(gen_random_bytes(16), 'hex')
     WHERE id = NEW.id;
  END IF;

  INSERT INTO public.onboarding_sequences (contractor_lead_id, status, current_step, next_send_at)
  VALUES (NEW.id, 'active', 0, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enroll_contractor_onboarding ON public.contractor_leads;
CREATE TRIGGER trg_enroll_contractor_onboarding
  AFTER INSERT OR UPDATE OF pipeline_status ON public.contractor_leads
  FOR EACH ROW EXECUTE FUNCTION public.enroll_contractor_onboarding();

-- 7. Cancel queued + close sequence on paid subscription
CREATE OR REPLACE FUNCTION public.cancel_onboarding_on_paid(p_contractor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT id INTO v_lead_id
  FROM public.contractor_leads
  WHERE contractor_id = p_contractor_id
  ORDER BY created_at DESC LIMIT 1;
  IF v_lead_id IS NULL THEN RETURN; END IF;

  UPDATE public.contractor_leads
     SET pipeline_status = 'paid',
         paid_at = COALESCE(paid_at, now())
   WHERE id = v_lead_id;

  UPDATE public.onboarding_sequences
     SET status = 'completed_paid', stopped_reason = 'subscription_active'
   WHERE contractor_lead_id = v_lead_id
     AND status IN ('active','waiting','paused');

  UPDATE public.contractor_onboarding_messages
     SET status = 'skipped', skip_reason = 'paid'
   WHERE contractor_lead_id = v_lead_id
     AND status = 'queued';
END;
$$;
