-- READ ONLY. Exact SID only. No RPC, provider calls, UPDATE or raw PII output.
-- One matching log total, explicitly non-test/non-simulation; no fuzzy fallback.
WITH candidates AS (
 SELECT e.id, e.message_sid, e.prospect_id, e.contractor_id, e.recipient,
   count(l.id) AS matches,
   bool_and(l.is_simulation IS FALSE AND l.is_test_e2e IS FALSE) AS real_log,
   max(l.prospect_id::text) AS log_prospect, max(l.contractor_id::text) AS log_contractor,
   max(l.recipient_phone) AS log_recipient
 FROM public.outreach_sms_events e
 LEFT JOIN public.acq_sms_logs l ON l.provider_message_id = e.message_sid
 GROUP BY e.id,e.message_sid,e.prospect_id,e.contractor_id,e.recipient
), classified AS (
 SELECT id, CASE
 WHEN message_sid !~ '^(SM|MM)[0-9a-fA-F]{32}$' OR matches <> 1 OR real_log IS NOT TRUE THEN 'unresolved'
 WHEN (prospect_id IS NOT NULL AND log_prospect IS NOT NULL AND prospect_id::text <> log_prospect)
   OR (contractor_id IS NOT NULL AND log_contractor IS NOT NULL AND contractor_id::text <> log_contractor)
   OR (recipient IS NOT NULL AND btrim(recipient) <> '' AND lower(btrim(recipient)) <> 'unknown'
       AND log_recipient ~ '^\+[1-9][0-9]{7,14}$' AND recipient <> log_recipient) THEN 'identity_conflict'
 WHEN (prospect_id IS NULL AND log_prospect IS NOT NULL)
   OR (contractor_id IS NULL AND log_contractor IS NOT NULL)
   OR ((recipient IS NULL OR btrim(recipient) = '' OR lower(btrim(recipient)) = 'unknown')
       AND log_recipient ~ '^\+[1-9][0-9]{7,14}$') THEN 'eligible_preview'
 ELSE 'unresolved' END AS decision
 FROM candidates
)
SELECT decision, count(*)::int AS events FROM classified GROUP BY decision ORDER BY decision;
