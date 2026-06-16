
-- ============================================
-- Curiosity Funnel — tagging + sequence + events
-- ============================================

-- 1. Tag leads with funnel + private slug
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS funnel_type text NOT NULL DEFAULT 'standard_onboarding',
  ADD COLUMN IF NOT EXISTS curiosity_slug text,
  ADD COLUMN IF NOT EXISTS curiosity_token text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contractor_leads_funnel_type_chk') THEN
    ALTER TABLE public.contractor_leads
      ADD CONSTRAINT contractor_leads_funnel_type_chk
      CHECK (funnel_type IN ('standard_onboarding','ai_score_curiosity'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS contractor_leads_curiosity_slug_uk
  ON public.contractor_leads(curiosity_slug) WHERE curiosity_slug IS NOT NULL;

-- 2. Curiosity sequences
CREATE TABLE IF NOT EXISTS public.curiosity_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  current_step int NOT NULL DEFAULT 1,
  next_send_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  clicked_at timestamptz,
  revealed_at timestamptz,
  activated_at timestamptz,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT curiosity_sequences_status_chk CHECK (status IN
    ('active','waiting','completed_clicked','completed_paid','completed_unsubscribed','failed','paused'))
);

GRANT SELECT ON public.curiosity_sequences TO authenticated;
GRANT ALL ON public.curiosity_sequences TO service_role;
ALTER TABLE public.curiosity_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "curiosity_sequences_admin_all" ON public.curiosity_sequences;
CREATE POLICY "curiosity_sequences_admin_all" ON public.curiosity_sequences
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS curiosity_sequences_due_idx
  ON public.curiosity_sequences(status, next_send_at)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS curiosity_sequences_lead_idx
  ON public.curiosity_sequences(lead_id);

-- 3. Funnel events
CREATE TABLE IF NOT EXISTS public.curiosity_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  slug text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT curiosity_funnel_events_type_chk CHECK (event_type IN
    ('sms_sent','sms_delivered','sms_failed','page_view','cta_revealed',
     'analysis_started','analysis_completed','score_revealed',
     'cta_activate_clicked','checkout_started','paid','unsubscribed'))
);

GRANT SELECT ON public.curiosity_funnel_events TO authenticated;
GRANT ALL ON public.curiosity_funnel_events TO service_role;
ALTER TABLE public.curiosity_funnel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "curiosity_funnel_events_admin_read" ON public.curiosity_funnel_events;
CREATE POLICY "curiosity_funnel_events_admin_read" ON public.curiosity_funnel_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS curiosity_funnel_events_lead_idx
  ON public.curiosity_funnel_events(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS curiosity_funnel_events_type_idx
  ON public.curiosity_funnel_events(event_type, created_at DESC);

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.curiosity_sequences_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_curiosity_sequences_touch ON public.curiosity_sequences;
CREATE TRIGGER trg_curiosity_sequences_touch
  BEFORE UPDATE ON public.curiosity_sequences
  FOR EACH ROW EXECUTE FUNCTION public.curiosity_sequences_touch();

-- 5. Slug generator (lowercase + random suffix)
CREATE OR REPLACE FUNCTION public.generate_curiosity_slug(_business_name text, _lead_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  base text;
  suffix text;
BEGIN
  base := lower(regexp_replace(coalesce(_business_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from base);
  IF length(base) < 2 THEN base := 'pro'; END IF;
  base := left(base, 40);
  suffix := substring(replace(_lead_id::text, '-', ''), 1, 6);
  RETURN base || '-' || suffix;
END $$;

-- 6. Auto-enroll trigger
CREATE OR REPLACE FUNCTION public.enroll_curiosity_sequence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.funnel_type = 'ai_score_curiosity'
     AND NEW.pipeline_status = 'ready_for_outreach'
     AND (OLD.pipeline_status IS DISTINCT FROM NEW.pipeline_status
          OR OLD.funnel_type IS DISTINCT FROM NEW.funnel_type)
     AND NEW.unsubscribed_at IS NULL
     AND NEW.paid_at IS NULL THEN

    IF NEW.curiosity_slug IS NULL THEN
      NEW.curiosity_slug := public.generate_curiosity_slug(NEW.company_name, NEW.id);
    END IF;
    IF NEW.curiosity_token IS NULL THEN
      NEW.curiosity_token := replace(gen_random_uuid()::text, '-', '');
    END IF;

    INSERT INTO public.curiosity_sequences (lead_id, status, current_step, next_send_at)
    VALUES (NEW.id, 'active', 1, now())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enroll_curiosity ON public.contractor_leads;
CREATE TRIGGER trg_enroll_curiosity
  BEFORE UPDATE ON public.contractor_leads
  FOR EACH ROW EXECUTE FUNCTION public.enroll_curiosity_sequence();

-- 7. Cancel on paid
CREATE OR REPLACE FUNCTION public.cancel_curiosity_on_paid(_lead_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.curiosity_sequences
  SET status = 'completed_paid', activated_at = now()
  WHERE lead_id = _lead_id AND status IN ('active','waiting');

  INSERT INTO public.curiosity_funnel_events (lead_id, event_type, metadata)
  VALUES (_lead_id, 'paid', '{}'::jsonb);
END $$;

-- 8. Cancel on unsubscribed (called from twilio-inbound)
CREATE OR REPLACE FUNCTION public.cancel_curiosity_on_unsubscribed(_lead_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.curiosity_sequences
  SET status = 'completed_unsubscribed'
  WHERE lead_id = _lead_id AND status IN ('active','waiting');

  INSERT INTO public.curiosity_funnel_events (lead_id, event_type, metadata)
  VALUES (_lead_id, 'unsubscribed', '{}'::jsonb);
END $$;

-- 9. Public slug resolver (anon-safe — returns minimal display fields)
CREATE OR REPLACE FUNCTION public.resolve_curiosity_slug(_slug text, _token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  rec record;
BEGIN
  SELECT id, company_name, first_name, city, category_primary, trade, website_url, ai_visibility_score
    INTO rec
  FROM public.contractor_leads
  WHERE curiosity_slug = _slug AND curiosity_token = _token
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO public.curiosity_funnel_events (lead_id, slug, event_type, metadata)
  VALUES (rec.id, _slug, 'page_view', '{}'::jsonb);

  RETURN jsonb_build_object(
    'lead_id', rec.id,
    'business_name', rec.company_name,
    'first_name', rec.first_name,
    'city', rec.city,
    'service', coalesce(rec.trade, rec.category_primary),
    'website_url', rec.website_url,
    'ai_visibility_score', rec.ai_visibility_score
  );
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_curiosity_slug(text, text) TO anon, authenticated;
