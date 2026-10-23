-- STAGED ONLY: never auto-applied. Existing RPC/signature/ACL, no backfill.
-- Execute only after preflight, isolated QA and separate production authorization.
BEGIN;
SET LOCAL lock_timeout = '3s';
CREATE OR REPLACE FUNCTION public.record_outreach_sms_event(p_sid text, p_kind text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id uuid; v_ts timestamptz; v_payload jsonb;
  v_prospect uuid; v_contractor uuid; v_recipient text;
  v_row public.outreach_sms_events%ROWTYPE; v_conflict boolean;
  v_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  IF p_sid IS NULL OR p_sid !~ '^(SM|MM)[0-9a-fA-F]{32}$' THEN
    RAISE EXCEPTION 'invalid_sms_sid' USING ERRCODE = '22023';
  END IF;
  v_payload := CASE WHEN jsonb_typeof(p_payload) = 'object' THEN p_payload ELSE '{}'::jsonb END;
  v_ts := COALESCE((v_payload->>'ts')::timestamptz, now());
  IF v_payload->>'prospect_id' ~ v_uuid THEN v_prospect := (v_payload->>'prospect_id')::uuid; END IF;
  IF v_payload->>'contractor_id' ~ v_uuid THEN v_contractor := (v_payload->>'contractor_id')::uuid; END IF;
  IF v_payload->>'recipient' ~ '^\+[1-9][0-9]{7,14}$' THEN v_recipient := v_payload->>'recipient'; END IF;
  -- New rows and existing rows use the same locked reconciliation below.
  INSERT INTO public.outreach_sms_events (message_sid, recipient)
  VALUES (p_sid, 'unknown') ON CONFLICT (message_sid) DO NOTHING;
  SELECT * INTO STRICT v_row FROM public.outreach_sms_events WHERE message_sid = p_sid FOR UPDATE;
  -- Any identity conflict blocks ALL attribution completion (no mixed identities).
  v_conflict := (v_row.prospect_id IS NOT NULL AND v_prospect IS NOT NULL AND v_row.prospect_id <> v_prospect)
    OR (v_row.contractor_id IS NOT NULL AND v_contractor IS NOT NULL AND v_row.contractor_id <> v_contractor)
    OR (v_row.recipient IS NOT NULL AND btrim(v_row.recipient) <> '' AND lower(btrim(v_row.recipient)) <> 'unknown'
        AND v_recipient IS NOT NULL AND v_row.recipient <> v_recipient);
  UPDATE public.outreach_sms_events SET
    prospect_id = CASE WHEN NOT v_conflict THEN COALESCE(prospect_id, v_prospect) ELSE prospect_id END,
    contractor_id = CASE WHEN NOT v_conflict THEN COALESCE(contractor_id, v_contractor) ELSE contractor_id END,
    recipient = CASE WHEN NOT v_conflict AND v_recipient IS NOT NULL
      AND (recipient IS NULL OR btrim(recipient) = '' OR lower(btrim(recipient)) = 'unknown') THEN v_recipient ELSE recipient END,
    sent_at      = CASE WHEN p_kind='sent'      THEN COALESCE(sent_at,v_ts)      ELSE sent_at END,
    delivered_at = CASE WHEN p_kind='delivered' THEN COALESCE(delivered_at,v_ts) ELSE delivered_at END,
    clicked_at   = CASE WHEN p_kind='clicked'   THEN COALESCE(clicked_at,v_ts)   ELSE clicked_at END,
    replied_at   = CASE WHEN p_kind='replied'   THEN COALESCE(replied_at,v_ts)   ELSE replied_at END,
    converted_at = CASE WHEN p_kind='converted' THEN COALESCE(converted_at,v_ts) ELSE converted_at END,
    failed_at    = CASE WHEN p_kind='failed'    THEN COALESCE(failed_at,v_ts)    ELSE failed_at END,
    status = COALESCE(v_payload->>'status', status),
    error_code = COALESCE(v_payload->>'error_code', error_code),
    -- No new raw body/phone/identity/token/error copies in metadata or last_error.
    -- Existing historic metadata is preserved; no retrospective purge.
    metadata = metadata || CASE WHEN v_payload->'backfilled' = 'true'::jsonb THEN '{"backfilled":true}'::jsonb ELSE '{}'::jsonb END,
    updated_at = now()
  WHERE message_sid = p_sid RETURNING id INTO v_id;
  RETURN v_id;
END $fn$;
-- CREATE OR REPLACE retains existing owner/ACL. Preflight must establish service-only access.
COMMIT;
