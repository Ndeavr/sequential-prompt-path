-- Not applied: verify backup integrity before remote writes.
-- One ledger: the NULL-anchor control row serializes runs, quotas and discovery.
CREATE TABLE public.casl_phone_capture_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_prospect_id uuid UNIQUE REFERENCES public.contractor_prospects(id) ON DELETE RESTRICT,
  domain text UNIQUE,
  phone text UNIQUE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('control','queued','running','retry','completed','blocked','failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 2),
  next_retry_at timestamptz,
  lease_owner uuid,
  lease_until timestamptz,
  last_reason text,
  last_attempt_at timestamptz,
  evidence_id uuid REFERENCES public.casl_consent_evidence(id) ON DELETE RESTRICT,
  discovery_cursor uuid,
  discovery_complete boolean NOT NULL DEFAULT false,
  quota_day date,
  daily_attempts integer NOT NULL DEFAULT 0 CHECK (daily_attempts BETWEEN 0 AND 20),
  run_attempts integer NOT NULL DEFAULT 0 CHECK (run_attempts BETWEEN 0 AND 2),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='control' AND contractor_prospect_id IS NULL) OR (status<>'control' AND contractor_prospect_id IS NOT NULL))
);
GRANT ALL ON public.casl_phone_capture_jobs TO service_role;
ALTER TABLE public.casl_phone_capture_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY capture_service_only ON public.casl_phone_capture_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX casl_capture_single_control ON public.casl_phone_capture_jobs ((status)) WHERE status='control';
CREATE INDEX casl_capture_due ON public.casl_phone_capture_jobs (status,next_retry_at) WHERE status IN ('queued','retry','running');
INSERT INTO public.casl_phone_capture_jobs(status) VALUES ('control');

CREATE FUNCTION public.begin_casl_phone_capture_run(p_run uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE c public.casl_phone_capture_jobs; today date := (now() AT TIME ZONE 'America/Toronto')::date;
BEGIN
  SELECT * INTO c FROM casl_phone_capture_jobs WHERE status='control' FOR UPDATE;
  IF NOT c.enabled THEN RETURN jsonb_build_object('acquired',false,'reason','paused'); END IF;
  IF c.lease_until>now() THEN RETURN jsonb_build_object('acquired',false,'reason','busy'); END IF;
  UPDATE casl_phone_capture_jobs SET status=CASE WHEN attempt_count<2 THEN 'retry' ELSE 'failed' END,
    next_retry_at=CASE WHEN attempt_count<2 THEN now()+interval '24 hours' ELSE NULL END,
    last_reason='stale_worker_lease',lease_owner=NULL,lease_until=NULL,updated_at=now()
    WHERE status='running' AND lease_until<=now();
  UPDATE casl_phone_capture_jobs SET lease_owner=p_run,lease_until=now()+interval '5 minutes',
    daily_attempts=CASE WHEN quota_day=today THEN daily_attempts ELSE 0 END,quota_day=today,run_attempts=0,updated_at=now()
    WHERE status='control';
  RETURN jsonb_build_object('acquired',true,'cursor',c.discovery_cursor,'discovery_complete',c.discovery_complete);
END $$;

CREATE FUNCTION public.seed_casl_phone_capture_jobs(p_run uuid,p_candidates jsonb,p_cursor uuid,p_complete boolean) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE c public.casl_phone_capture_jobs; r jsonb;
BEGIN
  SELECT * INTO c FROM casl_phone_capture_jobs WHERE status='control' FOR UPDATE;
  IF NOT c.enabled OR c.lease_owner IS DISTINCT FROM p_run OR c.lease_until<=now() THEN RAISE EXCEPTION 'lease_lost'; END IF;
  IF jsonb_typeof(p_candidates)<>'array' OR jsonb_array_length(p_candidates)>250 THEN RAISE EXCEPTION 'invalid_candidates'; END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(p_candidates) LOOP
    IF (r->>'phone') !~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$' OR (r->>'domain') !~ '^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$' THEN RAISE EXCEPTION 'invalid_candidate'; END IF;
    INSERT INTO casl_phone_capture_jobs(contractor_prospect_id,domain,phone)
      SELECT p.id,r->>'domain',r->>'phone' FROM contractor_prospects p
      WHERE p.id=(r->>'id')::uuid AND p.phone_e164=r->>'phone'
        AND p.do_not_contact=false AND p.suppression_reason IS NULL
        AND p.outreach_status IN ('none','new','pending','not_contacted','not_started')
        AND p.website_url LIKE 'https://%'
        AND (SELECT count(*) FROM contractor_prospects d WHERE d.phone_e164=p.phone_e164)=1
        AND NOT EXISTS (SELECT 1 FROM casl_consent_evidence e WHERE e.contractor_prospect_id=p.id AND e.destination_type='phone_sms' AND e.source_type='company_website')
      ON CONFLICT DO NOTHING;
  END LOOP;
  UPDATE casl_phone_capture_jobs SET discovery_cursor=p_cursor,discovery_complete=p_complete,updated_at=now() WHERE status='control';
END $$;

CREATE FUNCTION public.claim_casl_phone_capture_jobs(p_run uuid,p_limit integer DEFAULT 2) RETURNS SETOF public.casl_phone_capture_jobs
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE c public.casl_phone_capture_jobs; n integer;
BEGIN
  IF p_limit<1 OR p_limit>2 THEN RAISE EXCEPTION 'invalid_limit'; END IF;
  SELECT * INTO c FROM casl_phone_capture_jobs WHERE status='control' FOR UPDATE;
  IF NOT c.enabled OR c.lease_owner IS DISTINCT FROM p_run OR c.lease_until<=now() THEN RAISE EXCEPTION 'lease_lost'; END IF;
  n:=LEAST(p_limit,20-c.daily_attempts,2-c.run_attempts);
  IF n<=0 THEN RETURN; END IF;
  RETURN QUERY WITH due AS (
    SELECT j.id FROM casl_phone_capture_jobs j WHERE j.status IN ('queued','retry') AND j.attempt_count<2
      AND (j.next_retry_at IS NULL OR j.next_retry_at<=now())
      ORDER BY j.created_at,j.id FOR UPDATE SKIP LOCKED LIMIT n
  ) UPDATE casl_phone_capture_jobs j SET status='running',attempt_count=j.attempt_count+1,
    last_attempt_at=now(),lease_owner=p_run,lease_until=c.lease_until,updated_at=now()
    FROM due WHERE j.id=due.id RETURNING j.*;
  GET DIAGNOSTICS n=ROW_COUNT;
  UPDATE casl_phone_capture_jobs SET daily_attempts=daily_attempts+n,run_attempts=run_attempts+n,updated_at=now() WHERE status='control';
END $$;

-- Lease fencing, exact-source dedupe and evidence insertion are ONE transaction.
-- Reuses the canonical helper's row, never replaces human-signed records.
CREATE FUNCTION public.persist_casl_phone_capture(p_run uuid,p_prospect uuid,p_evidence jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE c public.casl_phone_capture_jobs; j public.casl_phone_capture_jobs; result uuid;
BEGIN
  SELECT * INTO c FROM casl_phone_capture_jobs WHERE status='control' FOR UPDATE;
  SELECT * INTO j FROM casl_phone_capture_jobs WHERE contractor_prospect_id=p_prospect FOR UPDATE;
  IF NOT c.enabled OR c.lease_owner IS DISTINCT FROM p_run OR c.lease_until<=now()
    OR j.status<>'running' OR j.lease_owner IS DISTINCT FROM p_run OR j.lease_until<=now() THEN RAISE EXCEPTION 'lease_lost'; END IF;
  IF (p_evidence->>'contractor_prospect_id')::uuid IS DISTINCT FROM p_prospect
    OR p_evidence->>'destination_type' IS DISTINCT FROM 'phone_sms'
    OR p_evidence->>'source_type' IS DISTINCT FROM 'company_website'
    OR p_evidence->>'destination_normalized' IS DISTINCT FROM substring(j.phone FROM 3)
    OR p_evidence->>'lawful_basis' IS DISTINCT FROM 'implicit_public_conspicuous'
    OR p_evidence->>'verification_method' IS DISTINCT FROM 'first_party_phone_pending_human_review'
    OR COALESCE(p_evidence->>'source_url','') NOT LIKE 'https://%'
    OR lower(regexp_replace(split_part(substring(p_evidence->>'source_url' FROM 9),'/',1),'^www\.','')) IS DISTINCT FROM j.domain
    OR COALESCE(p_evidence->>'page_sha256','') !~ '^[a-f0-9]{64}$'
    OR NULLIF(p_evidence->>'business_relevance_explanation','') IS NULL
    OR NULLIF(p_evidence->>'retrieved_at','') IS NULL
    OR p_evidence->>'refusal_statement_found' IS DISTINCT FROM 'false'
    OR p_evidence->>'auto_captured' IS DISTINCT FROM 'true'
    OR p_evidence->>'reviewer_id' IS NOT NULL OR p_evidence->>'reviewer_notes' IS NOT NULL
    OR p_evidence->>'contractor_lead_id' IS NOT NULL OR p_evidence->>'outbound_company_id' IS NOT NULL
    THEN RAISE EXCEPTION 'invalid_pending_evidence'; END IF;
  IF NOT EXISTS (SELECT 1 FROM contractor_prospects p WHERE p.id=p_prospect AND p.phone_e164=j.phone AND NOT p.do_not_contact AND p.suppression_reason IS NULL AND p.outreach_status IN ('none','new','pending','not_contacted','not_started'))
    OR public.is_phone_suppressed(j.phone) IS DISTINCT FROM false
    OR EXISTS (SELECT 1 FROM sms_opt_outs WHERE normalized_phone IN (j.phone,substring(j.phone FROM 3))) THEN RAISE EXCEPTION 'source_no_longer_eligible'; END IF;
  SELECT e.id INTO result FROM casl_consent_evidence e WHERE e.contractor_prospect_id=p_prospect AND e.destination_type='phone_sms'
    AND e.destination_normalized=p_evidence->>'destination_normalized' AND e.source_url=p_evidence->>'source_url' LIMIT 1;
  IF result IS NULL THEN
    INSERT INTO casl_consent_evidence(contractor_prospect_id,destination_type,destination_normalized,lawful_basis,source_url,source_type,source_publisher,retrieved_at,page_sha256,refusal_statement_found,business_relevance_explanation,verification_method,is_valid,auto_captured,capture_agent,reviewer_id)
    VALUES(p_prospect,'phone_sms',p_evidence->>'destination_normalized','implicit_public_conspicuous',p_evidence->>'source_url','company_website',p_evidence->>'source_publisher',(p_evidence->>'retrieved_at')::timestamptz,p_evidence->>'page_sha256',false,p_evidence->>'business_relevance_explanation','first_party_phone_pending_human_review',true,true,'enrich-official-website',NULL) RETURNING id INTO result;
  END IF;
  UPDATE casl_phone_capture_jobs SET evidence_id=result,status='completed',last_reason='publication_observed_human_review_required',updated_at=now() WHERE id=j.id;
  RETURN result;
END $$;

CREATE FUNCTION public.finish_casl_phone_capture_job(p_run uuid,p_prospect uuid,p_evidence uuid,p_reason text,p_retry boolean) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  UPDATE casl_phone_capture_jobs SET status=CASE WHEN evidence_id IS NOT NULL THEN 'completed' WHEN p_retry AND attempt_count<2 THEN 'retry' WHEN p_retry THEN 'failed' ELSE 'blocked' END,
    next_retry_at=CASE WHEN evidence_id IS NULL AND p_retry AND attempt_count<2 THEN now()+interval '24 hours' ELSE NULL END,
    last_reason=left(p_reason,100),lease_owner=NULL,lease_until=NULL,updated_at=now()
    WHERE contractor_prospect_id=p_prospect AND lease_owner=p_run AND lease_until>now();
  IF NOT FOUND THEN RAISE EXCEPTION 'lease_lost'; END IF;
END $$;

CREATE FUNCTION public.end_casl_phone_capture_run(p_run uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$
  UPDATE casl_phone_capture_jobs SET lease_owner=NULL,lease_until=NULL,updated_at=now() WHERE status='control' AND lease_owner=p_run;
$$;

REVOKE ALL ON FUNCTION public.begin_casl_phone_capture_run(uuid),public.seed_casl_phone_capture_jobs(uuid,jsonb,uuid,boolean),public.claim_casl_phone_capture_jobs(uuid,integer),public.persist_casl_phone_capture(uuid,uuid,jsonb),public.finish_casl_phone_capture_job(uuid,uuid,uuid,text,boolean),public.end_casl_phone_capture_run(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_casl_phone_capture_run(uuid),public.seed_casl_phone_capture_jobs(uuid,jsonb,uuid,boolean),public.claim_casl_phone_capture_jobs(uuid,integer),public.persist_casl_phone_capture(uuid,uuid,jsonb),public.finish_casl_phone_capture_job(uuid,uuid,uuid,text,boolean),public.end_casl_phone_capture_run(uuid) TO service_role;