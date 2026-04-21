ALTER TABLE public.contractors_prospects
  ADD COLUMN IF NOT EXISTS enrichment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS emails_found jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS email_confidence integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_email text,
  ADD COLUMN IF NOT EXISTS social_profiles jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sms_queue_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS enrichment_log jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outreach_status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_prospects_enrichment_status ON public.contractors_prospects(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_prospects_outreach_status ON public.contractors_prospects(outreach_status);
CREATE INDEX IF NOT EXISTS idx_prospects_city_category ON public.contractors_prospects(city, category);