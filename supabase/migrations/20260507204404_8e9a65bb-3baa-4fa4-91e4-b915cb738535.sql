
-- Trade categories for exterior trades
DO $$ BEGIN
  CREATE TYPE public.exterior_trade AS ENUM (
    'roofing','pavers','asphalt','landscaping','snow_removal',
    'fences','decks','foundation','gutters','exterior_painting'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend contractor_prospects (only add columns if missing)
ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS trade_category public.exterior_trade,
  ADD COLUMN IF NOT EXISTS rbq_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rbq_license text,
  ADD COLUMN IF NOT EXISTS avg_job_value_cad integer;

CREATE INDEX IF NOT EXISTS idx_contractor_prospects_trade_category
  ON public.contractor_prospects(trade_category);

-- =============================================================
-- campaign_contacts
-- =============================================================
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  phone text,
  email text,
  segment text NOT NULL CHECK (segment IN ('A','B','C')),
  score numeric,
  lost_revenue_monthly integer,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','engaged','replied','clicked','opted_out','completed','failed','paused')),
  current_day text NOT NULL DEFAULT 'day_0'
    CHECK (current_day IN ('day_0','day_2','day_5','done')),
  sequence_started_at timestamptz,
  sequence_completed_at timestamptz,
  scheduled_next_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,

  day_0_email_sent_at timestamptz,
  day_0_email_opened_at timestamptz,
  day_0_sms_sent_at timestamptz,
  day_0_sms_delivered_at timestamptz,
  day_2_email_sent_at timestamptz,
  day_2_email_opened_at timestamptz,
  day_2_sms_sent_at timestamptz,
  day_5_email_sent_at timestamptz,
  day_5_sms_sent_at timestamptz,

  reply_received_at timestamptz,
  reply_channel text,
  reply_preview text,
  link_clicked_at timestamptz,
  link_clicked_url text,
  book_url_clicked boolean NOT NULL DEFAULT false,
  score_page_clicked boolean NOT NULL DEFAULT false,

  opted_out boolean NOT NULL DEFAULT false,
  opted_out_at timestamptz,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON public.campaign_contacts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_segment ON public.campaign_contacts(segment);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_scheduled ON public.campaign_contacts(scheduled_next_at) WHERE status IN ('active','engaged');
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_contacts_prospect ON public.campaign_contacts(prospect_id);

ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaign_contacts"
  ON public.campaign_contacts FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =============================================================
-- campaign_send_log (append-only audit)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.campaign_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_contact_id uuid REFERENCES public.campaign_contacts(id) ON DELETE CASCADE,
  company_name text,
  day text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  status text NOT NULL CHECK (status IN ('queued','sent','delivered','failed','bounced','opened','clicked','replied')),
  provider_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_send_log_contact ON public.campaign_send_log(campaign_contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_send_log_sent_at ON public.campaign_send_log(sent_at DESC);

ALTER TABLE public.campaign_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read campaign_send_log"
  ON public.campaign_send_log FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));

-- Inserts allowed by service role only (no client policy)

-- =============================================================
-- campaign_hot_leads
-- =============================================================
CREATE TABLE IF NOT EXISTS public.campaign_hot_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_contact_id uuid REFERENCES public.campaign_contacts(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  phone text,
  email text,
  reply_text text,
  reply_channel text,
  replied_at timestamptz NOT NULL DEFAULT now(),
  assigned_to text DEFAULT 'unassigned',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','booked','closed','dropped')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_hot_leads_status ON public.campaign_hot_leads(status);

ALTER TABLE public.campaign_hot_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaign_hot_leads"
  ON public.campaign_hot_leads FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =============================================================
-- campaign_settings (singleton)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.campaign_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_sms_cap integer NOT NULL DEFAULT 50,
  daily_email_cap integer NOT NULL DEFAULT 100,
  send_window_start time NOT NULL DEFAULT '07:00',
  send_window_end time NOT NULL DEFAULT '21:00',
  send_on_sunday boolean NOT NULL DEFAULT false,
  max_failures_before_stop integer NOT NULL DEFAULT 3,
  paused_globally boolean NOT NULL DEFAULT false,
  slack_webhook_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.campaign_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaign_settings"
  ON public.campaign_settings FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =============================================================
-- Trigger: auto-segmentation on insert
-- =============================================================
CREATE OR REPLACE FUNCTION public.campaign_contacts_auto_segment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  has_email boolean := NEW.email IS NOT NULL AND length(trim(NEW.email)) > 0;
  has_web boolean := false;
BEGIN
  IF NEW.prospect_id IS NOT NULL THEN
    SELECT (website_url IS NOT NULL AND length(trim(website_url)) > 0)
      INTO has_web
    FROM public.contractor_prospects WHERE id = NEW.prospect_id;
  END IF;

  IF NEW.segment IS NULL THEN
    IF has_email AND has_web THEN
      NEW.segment := 'C';
    ELSIF has_web THEN
      NEW.segment := 'B';
    ELSE
      NEW.segment := 'A';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_campaign_contacts_segment ON public.campaign_contacts;
CREATE TRIGGER trg_campaign_contacts_segment
  BEFORE INSERT OR UPDATE ON public.campaign_contacts
  FOR EACH ROW EXECUTE FUNCTION public.campaign_contacts_auto_segment();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_send_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_hot_leads;
