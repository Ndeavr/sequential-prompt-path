
-- ============================================================================
-- UNPRO — Compliance hardening (Phase C, step 1 of N)
-- NO-SEND. Additive schema only. No existing sender is affected at runtime.
-- ============================================================================

-- 1. Message classification enum
DO $$ BEGIN
  CREATE TYPE public.message_purpose AS ENUM (
    'commercial_outreach',
    'transactional',
    'authentication',
    'service_notification',
    'internal_test'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.outbound_sent_messages
  ADD COLUMN IF NOT EXISTS message_purpose public.message_purpose;

ALTER TABLE public.acq_sms_logs
  ADD COLUMN IF NOT EXISTS message_purpose public.message_purpose;

CREATE INDEX IF NOT EXISTS idx_outbound_sent_purpose
  ON public.outbound_sent_messages(message_purpose)
  WHERE message_purpose IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acq_sms_logs_purpose
  ON public.acq_sms_logs(message_purpose)
  WHERE message_purpose IS NOT NULL;

-- Advisory trigger: warn when a real (non-simulation) commercial send lands without a purpose.
-- Uses RAISE NOTICE — does NOT block, so OTP / transactional paths are safe.
CREATE OR REPLACE FUNCTION public.acq_sms_logs_purpose_advisory()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.message_purpose IS NULL
     AND COALESCE(NEW.is_simulation, false) = false
     AND COALESCE(NEW.is_test_e2e, false) = false THEN
    RAISE NOTICE 'acq_sms_logs insert without message_purpose (id=%, recipient=%)', NEW.id, NEW.recipient_phone;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acq_sms_logs_purpose_advisory ON public.acq_sms_logs;
CREATE TRIGGER trg_acq_sms_logs_purpose_advisory
  BEFORE INSERT ON public.acq_sms_logs
  FOR EACH ROW EXECUTE FUNCTION public.acq_sms_logs_purpose_advisory();

-- 2. CASL consent evidence — normalized, append-only per lead + destination
CREATE TABLE IF NOT EXISTS public.casl_consent_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_lead_id UUID REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  destination_type TEXT NOT NULL CHECK (destination_type IN ('phone_sms','email')),
  destination_normalized TEXT NOT NULL,
  lawful_basis TEXT NOT NULL CHECK (lawful_basis IN (
    'implicit_public_conspicuous',
    'implicit_business_relationship',
    'express_written',
    'express_verbal_recorded',
    'inquiry_recent'
  )),
  source_url TEXT,
  source_type TEXT,
  source_publisher TEXT,
  retrieved_at TIMESTAMPTZ,
  page_sha256 TEXT,
  screenshot_storage_key TEXT,
  refusal_statement_found BOOLEAN NOT NULL DEFAULT false,
  refusal_statement_snippet TEXT,
  business_relevance_explanation TEXT,
  verification_method TEXT,
  reviewer_id UUID,
  reviewer_notes TEXT,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  invalidated_at TIMESTAMPTZ,
  invalidated_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_casl_evidence_lead ON public.casl_consent_evidence(contractor_lead_id);
CREATE INDEX IF NOT EXISTS idx_casl_evidence_dest ON public.casl_consent_evidence(destination_type, destination_normalized);
CREATE INDEX IF NOT EXISTS idx_casl_evidence_valid ON public.casl_consent_evidence(is_valid) WHERE is_valid = true;

GRANT SELECT, INSERT ON public.casl_consent_evidence TO authenticated;
GRANT ALL ON public.casl_consent_evidence TO service_role;

ALTER TABLE public.casl_consent_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "casl_evidence_admin_manage" ON public.casl_consent_evidence
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "casl_evidence_service_role_all" ON public.casl_consent_evidence
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Append-only: block UPDATE/DELETE except by service_role or when explicitly invalidating a valid row.
CREATE OR REPLACE FUNCTION public.casl_evidence_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'casl_consent_evidence is append-only (DELETE blocked)';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Only permit flipping is_valid from true → false with invalidation metadata.
    IF OLD.is_valid = false AND NEW.is_valid = false THEN
      IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'casl_consent_evidence is append-only (row already invalidated)';
      END IF;
    END IF;
    IF OLD.is_valid = true AND NEW.is_valid = true
       AND (OLD.source_url IS DISTINCT FROM NEW.source_url
            OR OLD.page_sha256 IS DISTINCT FROM NEW.page_sha256
            OR OLD.lawful_basis IS DISTINCT FROM NEW.lawful_basis
            OR OLD.retrieved_at IS DISTINCT FROM NEW.retrieved_at
            OR OLD.destination_normalized IS DISTINCT FROM NEW.destination_normalized) THEN
      IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'casl_consent_evidence historical fields are immutable';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_casl_evidence_append_only ON public.casl_consent_evidence;
CREATE TRIGGER trg_casl_evidence_append_only
  BEFORE UPDATE OR DELETE ON public.casl_consent_evidence
  FOR EACH ROW EXECUTE FUNCTION public.casl_evidence_append_only();

CREATE OR REPLACE FUNCTION public.set_updated_at_generic()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RETURN NEW; END; $$;

-- 3. Unified suppression view + helper function
CREATE OR REPLACE VIEW public.suppression_index
WITH (security_invoker = true) AS
SELECT
  'sms_opt_outs'::text                          AS source_table,
  regexp_replace(normalized_phone, '\D', '', 'g') AS normalized_phone,
  NULL::text                                     AS normalized_email,
  reason                                         AS reason,
  opted_out_at                                   AS occurred_at
FROM public.sms_opt_outs
UNION ALL
SELECT
  'outreach_suppressions'::text,
  CASE WHEN contact_type IN ('phone','sms')
       THEN regexp_replace(contact_value, '\D', '', 'g') END,
  CASE WHEN contact_type = 'email' THEN lower(contact_value) END,
  suppression_reason,
  created_at
FROM public.outreach_suppressions
UNION ALL
SELECT
  'outbound_suppressions'::text,
  NULL,
  lower(email),
  suppression_reason,
  created_at
FROM public.outbound_suppressions
WHERE COALESCE(active, true) = true;

GRANT SELECT ON public.suppression_index TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_phone_suppressed(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.suppression_index
    WHERE normalized_phone IS NOT NULL
      AND normalized_phone = regexp_replace(COALESCE(p_phone,''), '\D', '', 'g')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_email_suppressed(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.suppression_index
    WHERE normalized_email IS NOT NULL
      AND normalized_email = lower(COALESCE(p_email,''))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_phone_suppressed(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_email_suppressed(TEXT) TO authenticated, service_role;

-- 4. Compliance-review marker column on contractor_leads (safe addition)
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS compliance_review_required BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS compliance_review_reason TEXT;

ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS compliance_review_flagged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contractor_leads_compliance_review
  ON public.contractor_leads(compliance_review_required)
  WHERE compliance_review_required = true;

-- 5. Reconciliation note table — records historical anomalies (append-only audit)
CREATE TABLE IF NOT EXISTS public.contractor_lead_compliance_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_lead_id UUID NOT NULL REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL,
  finding TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_compliance_notes_lead ON public.contractor_lead_compliance_notes(contractor_lead_id);

GRANT SELECT, INSERT ON public.contractor_lead_compliance_notes TO authenticated;
GRANT ALL ON public.contractor_lead_compliance_notes TO service_role;

ALTER TABLE public.contractor_lead_compliance_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_notes_admin_manage" ON public.contractor_lead_compliance_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "compliance_notes_service_role" ON public.contractor_lead_compliance_notes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.compliance_notes_append_only()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'contractor_lead_compliance_notes is append-only';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_compliance_notes_append_only ON public.contractor_lead_compliance_notes;
CREATE TRIGGER trg_compliance_notes_append_only
  BEFORE UPDATE OR DELETE ON public.contractor_lead_compliance_notes
  FOR EACH ROW EXECUTE FUNCTION public.compliance_notes_append_only();

-- 6. Flag Scelltech until history is reconciled (idempotent)
UPDATE public.contractor_leads
   SET compliance_review_required = true,
       compliance_review_reason   = 'orphaned_last_sms_at_without_log',
       compliance_review_flagged_at = COALESCE(compliance_review_flagged_at, now())
 WHERE id = '94c68be3-9317-4db4-92e2-16cc509db80e'
   AND compliance_review_required = false;

INSERT INTO public.contractor_lead_compliance_notes (contractor_lead_id, note_type, finding, evidence)
SELECT
  '94c68be3-9317-4db4-92e2-16cc509db80e'::uuid,
  'orphaned_last_sms_at',
  'contractor_leads.last_sms_at = 2026-06-14 but no matching row found in acq_sms_logs, sms_messages, or outreach_replies for the recipient tails 3586740 or 9907886. Prior send basis cannot be reconstructed. Do not contact until reconciled.',
  jsonb_build_object(
    'last_sms_at', '2026-06-14T13:15:07+00:00',
    'checked_tables', ARRAY['acq_sms_logs','sms_messages','outreach_replies'],
    'checked_tails', ARRAY['3586740','9907886']
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.contractor_lead_compliance_notes
  WHERE contractor_lead_id = '94c68be3-9317-4db4-92e2-16cc509db80e'::uuid
    AND note_type = 'orphaned_last_sms_at'
);

-- 7. Commercial pre-send eligibility view (read-only). Used by the pre-send gate.
CREATE OR REPLACE VIEW public.v_commercial_send_eligibility
WITH (security_invoker = true) AS
SELECT
  cl.id AS contractor_lead_id,
  cl.company_name,
  cl.phone,
  cl.mobile_phone,
  cl.email,
  cl.compliance_review_required,
  cl.compliance_review_reason,
  cl.last_sms_at,
  (
    SELECT COUNT(*) FROM public.casl_consent_evidence e
    WHERE e.contractor_lead_id = cl.id
      AND e.is_valid = true
      AND e.destination_type = 'phone_sms'
      AND (e.expires_at IS NULL OR e.expires_at > now())
  ) AS valid_phone_evidence_count,
  (
    SELECT COUNT(*) FROM public.casl_consent_evidence e
    WHERE e.contractor_lead_id = cl.id
      AND e.is_valid = true
      AND e.destination_type = 'email'
      AND (e.expires_at IS NULL OR e.expires_at > now())
  ) AS valid_email_evidence_count,
  public.is_phone_suppressed(COALESCE(cl.mobile_phone, cl.phone)) AS phone_suppressed,
  public.is_email_suppressed(cl.email) AS email_suppressed
FROM public.contractor_leads cl;

GRANT SELECT ON public.v_commercial_send_eligibility TO authenticated, service_role;
