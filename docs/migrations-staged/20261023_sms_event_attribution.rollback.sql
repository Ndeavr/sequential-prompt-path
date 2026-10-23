-- STAGED ONLY. Restore function definition only; never undo repaired customer rows.
-- Requires separate approval, saved pg_get_functiondef + ACL and isolated QA.
BEGIN;
SET LOCAL lock_timeout = '3s';
CREATE OR REPLACE FUNCTION public.record_outreach_sms_event(p_sid text, p_kind text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_ts timestamptz := COALESCE((p_payload->>'ts')::timestamptz, now());
BEGIN
  INSERT INTO public.outreach_sms_events (message_sid, recipient, campaign_id, contractor_id, template, body, metadata, sent_at, status)
  VALUES (p_sid, COALESCE(p_payload->>'recipient','unknown'), p_payload->>'campaign_id',
          NULLIF(p_payload->>'contractor_id','')::uuid, p_payload->>'template', p_payload->>'body', p_payload,
          CASE WHEN p_kind='sent' THEN v_ts END, p_payload->>'status')
  ON CONFLICT (message_sid) DO NOTHING;
  UPDATE public.outreach_sms_events SET
    sent_at      = CASE WHEN p_kind='sent'      THEN COALESCE(sent_at,v_ts)      ELSE sent_at END,
    delivered_at = CASE WHEN p_kind='delivered' THEN COALESCE(delivered_at,v_ts) ELSE delivered_at END,
    clicked_at   = CASE WHEN p_kind='clicked'   THEN COALESCE(clicked_at,v_ts)   ELSE clicked_at END,
    replied_at   = CASE WHEN p_kind='replied'   THEN COALESCE(replied_at,v_ts)   ELSE replied_at END,
    converted_at = CASE WHEN p_kind='converted' THEN COALESCE(converted_at,v_ts) ELSE converted_at END,
    failed_at    = CASE WHEN p_kind='failed'    THEN COALESCE(failed_at,v_ts)    ELSE failed_at END,
    status       = COALESCE(p_payload->>'status', status),
    error_code   = COALESCE(p_payload->>'error_code', error_code),
    last_error   = COALESCE(p_payload->>'error', last_error),
    metadata     = metadata || p_payload,
    updated_at   = now()
  WHERE message_sid = p_sid RETURNING id INTO v_id;
  RETURN v_id;
END $$;

COMMIT;
