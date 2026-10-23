-- READ ONLY. STOP on any mismatch; do not invoke the RPC.
SELECT pg_get_functiondef(p.oid) AS saved_definition, pg_get_userbyid(p.proowner) AS owner,
 p.proacl::text AS saved_acl, p.prosecdef, p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_exec,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS service_exec
FROM pg_proc p WHERE p.oid = 'public.record_outreach_sms_event(text,text,jsonb)'::regprocedure;
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='outreach_sms_events';
SELECT count(*) AS duplicate_sid_groups FROM
 (SELECT message_sid FROM public.outreach_sms_events GROUP BY message_sid HAVING count(*)>1) d;
SELECT key,value FROM public.system_flags WHERE key='OUTREACH_ENABLED';
SELECT id,gated FROM public.outreach_autopilot_gate WHERE id=1;
-- Expected: service_exec=true, anon/authenticated=false, unique message_sid,
-- no duplicate groups, OUTREACH_ENABLED=false, gated=true. Save definition/ACL privately.
