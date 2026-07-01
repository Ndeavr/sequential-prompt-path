ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS enrichment_last_error text,
  ADD COLUMN IF NOT EXISTS enrichment_last_source text,
  ADD COLUMN IF NOT EXISTS enrichment_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrichment_last_run_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contractor_leads_no_contact
  ON public.contractor_leads (created_at DESC)
  WHERE phone IS NULL AND email IS NULL;

CREATE INDEX IF NOT EXISTS idx_contractor_leads_ready_gate
  ON public.contractor_leads (lead_status)
  WHERE lead_status IN ('new','ready_for_contact');