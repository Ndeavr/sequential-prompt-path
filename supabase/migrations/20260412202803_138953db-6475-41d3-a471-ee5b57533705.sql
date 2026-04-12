
-- ============================================================
-- AUTONOMOUS OUTBOUND ENGINE — New tables + column additions
-- ============================================================

-- 1. Add missing columns to outbound_campaigns
ALTER TABLE public.outbound_campaigns
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS target_lead_count integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS auto_scraping_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_sending_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS hourly_send_limit integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2. Add missing columns to outbound_leads
ALTER TABLE public.outbound_leads
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS lead_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qualification_status text DEFAULT 'raw',
  ADD COLUMN IF NOT EXISTS sending_status text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS sequence_id uuid,
  ADD COLUMN IF NOT EXISTS mailbox_id uuid,
  ADD COLUMN IF NOT EXISTS next_step_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Add missing columns to outbound_mailboxes
ALTER TABLE public.outbound_mailboxes
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'smtp',
  ADD COLUMN IF NOT EXISTS hourly_send_limit integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS sent_today integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warmup_status text DEFAULT 'none';

-- 4. Add missing columns to outbound_sequences
ALTER TABLE public.outbound_sequences
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS goal text;

-- ============================================================
-- NEW TABLE: outbound_campaign_targets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outbound_campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.outbound_campaigns(id) ON DELETE CASCADE,
  city text NOT NULL,
  specialty text NOT NULL,
  radius_km integer DEFAULT 25,
  keyword_query text,
  max_results integer DEFAULT 50,
  source_key text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_campaign_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_campaign_targets" ON public.outbound_campaign_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- NEW TABLE: outbound_scraping_sources
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outbound_scraping_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'active',
  priority integer DEFAULT 1,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_scraping_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_scraping_sources" ON public.outbound_scraping_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- NEW TABLE: outbound_scraping_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outbound_scraping_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.outbound_campaigns(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text DEFAULT 'pending',
  source_count integer DEFAULT 0,
  raw_entity_count integer DEFAULT 0,
  valid_entity_count integer DEFAULT 0,
  deduplicated_count integer DEFAULT 0,
  lead_created_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  logs jsonb DEFAULT '[]'
);
ALTER TABLE public.outbound_scraping_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_scraping_runs" ON public.outbound_scraping_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- NEW TABLE: outbound_scraped_entities
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outbound_scraped_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraping_run_id uuid NOT NULL REFERENCES public.outbound_scraping_runs(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.outbound_campaigns(id) ON DELETE CASCADE,
  source_key text,
  external_id text,
  company_name text,
  website_url text,
  domain text,
  phone text,
  email text,
  city text,
  specialty text,
  raw_payload jsonb DEFAULT '{}',
  normalized_payload jsonb DEFAULT '{}',
  dedupe_hash text,
  status text DEFAULT 'raw',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_scraped_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_scraped_entities" ON public.outbound_scraped_entities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_scraped_entities_dedupe ON public.outbound_scraped_entities(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_scraped_entities_run ON public.outbound_scraped_entities(scraping_run_id);

-- ============================================================
-- NEW TABLE: outbound_lead_enrichment
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outbound_lead_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.outbound_leads(id) ON DELETE CASCADE,
  website_detected boolean DEFAULT false,
  email_detected boolean DEFAULT false,
  phone_detected boolean DEFAULT false,
  google_rating numeric,
  review_count integer,
  aipp_estimate_score numeric,
  enrichment_payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_lead_enrichment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_lead_enrichment" ON public.outbound_lead_enrichment FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- NEW TABLE: outbound_sending_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outbound_sending_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.outbound_campaigns(id) ON DELETE CASCADE,
  mailbox_id uuid NOT NULL REFERENCES public.outbound_mailboxes(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text DEFAULT 'pending',
  queued_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  skipped_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  logs jsonb DEFAULT '[]'
);
ALTER TABLE public.outbound_sending_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_sending_runs" ON public.outbound_sending_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- NEW TABLE: outbound_sent_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outbound_sent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.outbound_leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.outbound_campaigns(id) ON DELETE SET NULL,
  mailbox_id uuid REFERENCES public.outbound_mailboxes(id) ON DELETE SET NULL,
  sequence_id uuid REFERENCES public.outbound_sequences(id) ON DELETE SET NULL,
  sequence_step_id uuid REFERENCES public.outbound_sequence_steps(id) ON DELETE SET NULL,
  sent_at timestamptz DEFAULT now(),
  subject text,
  body_preview text,
  provider_message_id text,
  delivery_status text DEFAULT 'sent'
);
ALTER TABLE public.outbound_sent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_sent_messages" ON public.outbound_sent_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_sent_messages_lead ON public.outbound_sent_messages(lead_id);

-- ============================================================
-- NEW TABLE: outbound_global_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outbound_global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_daily_per_mailbox integer DEFAULT 50,
  max_hourly_per_mailbox integer DEFAULT 10,
  pause_bounce_threshold numeric DEFAULT 0.05,
  pause_spam_threshold numeric DEFAULT 0.02,
  dedupe_window_days integer DEFAULT 90,
  default_country text DEFAULT 'CA',
  default_region text DEFAULT 'QC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_global_settings" ON public.outbound_global_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes on FK columns
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign ON public.outbound_campaign_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scraping_runs_campaign ON public.outbound_scraping_runs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scraped_entities_campaign ON public.outbound_scraped_entities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_lead ON public.outbound_lead_enrichment(lead_id);
CREATE INDEX IF NOT EXISTS idx_sending_runs_campaign ON public.outbound_sending_runs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sending_runs_mailbox ON public.outbound_sending_runs(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_leads_qualification ON public.outbound_leads(qualification_status);
CREATE INDEX IF NOT EXISTS idx_leads_sending ON public.outbound_leads(sending_status);
