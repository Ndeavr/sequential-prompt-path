
-- Idempotency: one queue row per (source_table, source_lead_id)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cvq_source
  ON public.contact_verification_queue (source_table, source_lead_id)
  WHERE source_lead_id IS NOT NULL AND source_table IS NOT NULL;

-- Fast manual-call queue lookup (landline + no email)
CREATE INDEX IF NOT EXISTS idx_cvq_manual_call
  ON public.contact_verification_queue (manual_contact_priority_score DESC)
  WHERE phone_type = 'landline' AND (email IS NULL OR email = '');

-- Trigger function: fire-and-forget call to contact-verification-enqueue
CREATE OR REPLACE FUNCTION public.auto_enqueue_contact_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url text := 'https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/contact-verification-enqueue';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk';
  lead_row record;
  payload jsonb;
  already_queued boolean;
BEGIN
  -- Skip if already in the queue
  SELECT EXISTS (
    SELECT 1 FROM public.contact_verification_queue
    WHERE source_table = 'contractor_enriched_profiles'
      AND source_lead_id = NEW.lead_id
  ) INTO already_queued;
  IF already_queued THEN
    RETURN NEW;
  END IF;

  -- Pull canonical fields from contractor_leads (best-effort)
  SELECT id, company_name, email, phone, website_url, city, category_primary
    INTO lead_row
  FROM public.contractor_leads
  WHERE id = NEW.lead_id;

  IF lead_row.company_name IS NULL THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'business_name', lead_row.company_name,
    'email', lead_row.email,
    'phone', lead_row.phone,
    'website', lead_row.website_url,
    'city', lead_row.city,
    'category', lead_row.category_primary,
    'source_lead_id', lead_row.id,
    'source_table', 'contractor_enriched_profiles'
  );

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', anon_key,
      'Authorization', 'Bearer ' || anon_key
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block enrichment on verification enqueue failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enqueue_contact_verification ON public.contractor_enriched_profiles;
CREATE TRIGGER trg_auto_enqueue_contact_verification
AFTER INSERT OR UPDATE ON public.contractor_enriched_profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_enqueue_contact_verification();
