
-- ============ outbound_missions ============
CREATE TABLE IF NOT EXISTS public.outbound_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trade_slug text NOT NULL,
  cities text[] NOT NULL DEFAULT '{}',
  target_count integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'pending', -- pending|scraping|enriching|scoring|generating|sending|optimizing|paused|success|failed
  started_at timestamptz,
  completed_at timestamptz,
  first_payment_at timestamptz,
  success boolean NOT NULL DEFAULT false,
  scraped_count integer NOT NULL DEFAULT 0,
  enriched_count integer NOT NULL DEFAULT 0,
  scored_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  replied_count integer NOT NULL DEFAULT 0,
  checkout_start_count integer NOT NULL DEFAULT 0,
  paid_count integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbound_missions TO authenticated;
GRANT ALL ON public.outbound_missions TO service_role;

ALTER TABLE public.outbound_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage missions" ON public.outbound_missions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ mission_territory_state ============
CREATE TABLE IF NOT EXISTS public.mission_territory_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.outbound_missions(id) ON DELETE CASCADE,
  city text NOT NULL,
  total_slots integer NOT NULL DEFAULT 5,
  taken_slots integer NOT NULL DEFAULT 0,
  remaining_slots integer GENERATED ALWAYS AS (greatest(total_slots - taken_slots, 0)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mission_id, city)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_territory_state TO authenticated;
GRANT ALL ON public.mission_territory_state TO service_role;

ALTER TABLE public.mission_territory_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage territory state" ON public.mission_territory_state
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ mission_id attribution columns ============
ALTER TABLE public.outbound_companies     ADD COLUMN IF NOT EXISTS mission_id uuid;
ALTER TABLE public.outbound_leads         ADD COLUMN IF NOT EXISTS mission_id uuid;
ALTER TABLE public.outbound_sent_messages ADD COLUMN IF NOT EXISTS mission_id uuid;

CREATE INDEX IF NOT EXISTS idx_outbound_companies_mission     ON public.outbound_companies(mission_id);
CREATE INDEX IF NOT EXISTS idx_outbound_leads_mission         ON public.outbound_leads(mission_id);
CREATE INDEX IF NOT EXISTS idx_outbound_sent_messages_mission ON public.outbound_sent_messages(mission_id);

-- ============ counter triggers ============
CREATE OR REPLACE FUNCTION public.mission_bump_scraped() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.mission_id IS NOT NULL THEN
    UPDATE public.outbound_missions
       SET scraped_count = scraped_count + 1, updated_at = now()
     WHERE id = NEW.mission_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mission_bump_scraped ON public.outbound_companies;
CREATE TRIGGER trg_mission_bump_scraped
AFTER INSERT ON public.outbound_companies
FOR EACH ROW EXECUTE FUNCTION public.mission_bump_scraped();

CREATE OR REPLACE FUNCTION public.mission_bump_sent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.mission_id IS NOT NULL THEN
    UPDATE public.outbound_missions
       SET sent_count = sent_count + 1, updated_at = now()
     WHERE id = NEW.mission_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mission_bump_sent ON public.outbound_sent_messages;
CREATE TRIGGER trg_mission_bump_sent
AFTER INSERT ON public.outbound_sent_messages
FOR EACH ROW EXECUTE FUNCTION public.mission_bump_sent();

-- update timestamp trigger
CREATE OR REPLACE FUNCTION public.mission_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mission_touch ON public.outbound_missions;
CREATE TRIGGER trg_mission_touch BEFORE UPDATE ON public.outbound_missions
FOR EACH ROW EXECUTE FUNCTION public.mission_touch_updated_at();

DROP TRIGGER IF EXISTS trg_territory_touch ON public.mission_territory_state;
CREATE TRIGGER trg_territory_touch BEFORE UPDATE ON public.mission_territory_state
FOR EACH ROW EXECUTE FUNCTION public.mission_touch_updated_at();

-- ============ realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.outbound_missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_territory_state;
