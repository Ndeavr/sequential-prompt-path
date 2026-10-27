-- Run ONLY in the disposable local PostgreSQL fixture, never production.
INSERT INTO contractor_prospects SELECT gen_random_uuid(),'+1450234'||lpad(n::text,4,'0'),false,NULL,'not_started','https://synthetic'||n||'.test/' FROM generate_series(1,25) n;
UPDATE casl_phone_capture_jobs SET enabled=true WHERE status='control';
DO $$
DECLARE run uuid:=gen_random_uuid(); state jsonb; total integer:=0; claimed integer; item record; attempt integer;
BEGIN
  IF has_table_privilege('anon','casl_phone_capture_jobs','SELECT') OR has_function_privilege('authenticated','begin_casl_phone_capture_run(uuid)','EXECUTE') THEN RAISE EXCEPTION 'public_access'; END IF;
  state:=begin_casl_phone_capture_run(run);
  IF NOT (state->>'acquired')::boolean THEN RAISE EXCEPTION 'lock_not_acquired'; END IF;
  IF (begin_casl_phone_capture_run(gen_random_uuid())->>'acquired')::boolean THEN RAISE EXCEPTION 'duplicate_lock'; END IF;
  PERFORM seed_casl_phone_capture_jobs(run,(SELECT jsonb_agg(jsonb_build_object('id',id,'phone',phone_e164,'domain',substring(website_url FROM 9 FOR length(website_url)-9))) FROM contractor_prospects),NULL,true);
  FOR attempt IN 1..10 LOOP
    IF attempt>1 THEN run:=gen_random_uuid(); PERFORM begin_casl_phone_capture_run(run); END IF;
    claimed:=0;
    FOR item IN SELECT * FROM claim_casl_phone_capture_jobs(run,2) LOOP
      claimed:=claimed+1;
      PERFORM finish_casl_phone_capture_job(run,item.contractor_prospect_id,NULL,'solicitation_refused',false);
    END LOOP;
    IF claimed<>2 THEN RAISE EXCEPTION 'two_per_run_rule'; END IF;
    IF EXISTS (SELECT 1 FROM claim_casl_phone_capture_jobs(run,2)) THEN RAISE EXCEPTION 'repeat_claim_exceeds_run_cap'; END IF;
    total:=total+claimed; PERFORM end_casl_phone_capture_run(run);
  END LOOP;
  run:=gen_random_uuid(); PERFORM begin_casl_phone_capture_run(run);
  IF EXISTS (SELECT 1 FROM claim_casl_phone_capture_jobs(run,2)) OR total<>20 THEN RAISE EXCEPTION 'twenty_per_day_rule'; END IF;
  PERFORM end_casl_phone_capture_run(run);
END $$;
-- Reset ONLY local quota for isolated cooldown/fencing scenarios.
UPDATE casl_phone_capture_jobs SET daily_attempts=0 WHERE status='control';
DO $$
DECLARE run uuid:=gen_random_uuid(); item record; evidence uuid; before_count integer;
BEGIN
  PERFORM begin_casl_phone_capture_run(run);
  SELECT * INTO item FROM claim_casl_phone_capture_jobs(run,1) LIMIT 1;
  SELECT count(*) INTO before_count FROM casl_consent_evidence;
  BEGIN
    PERFORM persist_casl_phone_capture(gen_random_uuid(),item.contractor_prospect_id,'{}'::jsonb);
    RAISE EXCEPTION 'stale_writer_accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'lease_lost' THEN RAISE; END IF; END;
  BEGIN
    PERFORM persist_casl_phone_capture(run,item.contractor_prospect_id,jsonb_build_object('reviewer_id',gen_random_uuid()));
    RAISE EXCEPTION 'human_signature_accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'invalid_pending_evidence' THEN RAISE; END IF; END;
  evidence:=persist_casl_phone_capture(run,item.contractor_prospect_id,jsonb_build_object('contractor_prospect_id',item.contractor_prospect_id,'destination_type','phone_sms','destination_normalized',substring(item.phone FROM 3),'lawful_basis','implicit_public_conspicuous','source_type','company_website','source_url','https://'||item.domain||'/','page_sha256',repeat('a',64),'retrieved_at',now(),'business_relevance_explanation','Synthetic visible phone quote, local QA only','refusal_statement_found',false,'auto_captured',true,'verification_method','first_party_phone_pending_human_review'));
  IF (SELECT count(*) FROM casl_consent_evidence)<>before_count+1 OR NOT EXISTS(SELECT 1 FROM casl_consent_evidence WHERE id=evidence AND reviewer_id IS NULL AND auto_captured) THEN RAISE EXCEPTION 'pending_evidence_rule'; END IF;
  PERFORM finish_casl_phone_capture_job(run,item.contractor_prospect_id,evidence,'publication_observed_human_review_required',false);
  PERFORM end_casl_phone_capture_run(run);
  run:=gen_random_uuid(); PERFORM begin_casl_phone_capture_run(run);
  SELECT * INTO item FROM claim_casl_phone_capture_jobs(run,1) LIMIT 1;
  PERFORM finish_casl_phone_capture_job(run,item.contractor_prospect_id,NULL,'connection_reset',true);
  IF NOT EXISTS(SELECT 1 FROM casl_phone_capture_jobs WHERE id=item.id AND status='retry' AND attempt_count=1 AND next_retry_at>=now()+interval '23 hours') THEN RAISE EXCEPTION 'cooldown_rule'; END IF;
  PERFORM end_casl_phone_capture_run(run);
END $$;
SELECT 'isolated caps, locks, fencing, pending evidence and cooldown PASS' AS result;