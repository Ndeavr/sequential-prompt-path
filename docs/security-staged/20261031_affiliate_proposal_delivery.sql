-- Authorized additive draft delivery. Existing policies and historic rows remain unchanged.
ALTER TABLE public.affiliate_proposals ADD COLUMN IF NOT EXISTS client_draft_token text;
-- Assignment affiliate_id references affiliates.id; proposal affiliate_id references auth user UUID.
CREATE OR REPLACE FUNCTION public.affiliate_proposal_draft(_action text, _prospect_id uuid, _offer_type text DEFAULT NULL, _inputs jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE k text; a record; p public.affiliate_proposals%rowtype; company text; token text; clean jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 SELECT af.id,af.user_id,af.referral_code INTO a FROM affiliates af JOIN affiliate_assignments s ON s.affiliate_id=af.id
 WHERE s.prospect_id=_prospect_id AND af.status='active' AND (af.user_id=auth.uid() OR has_role(auth.uid(),'admin'))
 ORDER BY CASE WHEN af.user_id=auth.uid() THEN 0 ELSE 1 END, s.assigned_at LIMIT 1;
 IF a.user_id IS NULL THEN RAISE EXCEPTION 'assignment_required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.user_id::text||':'||_prospect_id::text,0));
 SELECT * INTO p FROM affiliate_proposals WHERE affiliate_id=a.user_id AND prospect_id=_prospect_id AND payload->>'draft_version'='1' AND expires_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF _action='save' THEN
  IF _offer_type IS NULL OR _offer_type NOT IN ('activation_350','personnalise') THEN RAISE EXCEPTION 'invalid_offer'; END IF;
  IF _inputs IS NULL OR jsonb_typeof(_inputs)<>'object' OR octet_length(_inputs::text)>10000 THEN RAISE EXCEPTION 'invalid_inputs'; END IF;
  FOREACH k IN ARRAY ARRAY['target_monthly_appointments','monthly_capacity','average_project_value','close_rate_estimate','service_radius_km'] LOOP
   IF _inputs ? k AND _inputs->k <> 'null'::jsonb AND (jsonb_typeof(_inputs->k)<>'number' OR NOT ((_inputs->>k)::numeric BETWEEN CASE WHEN k='close_rate_estimate' THEN 0.01 ELSE 1 END AND CASE WHEN k='average_project_value' THEN 10000000 WHEN k='close_rate_estimate' THEN 1 ELSE 1000 END)) THEN RAISE EXCEPTION 'invalid_inputs'; END IF;
  END LOOP;
  IF _inputs ? 'preferred_project_types' AND _inputs->'preferred_project_types'<>'null'::jsonb THEN
   IF jsonb_typeof(_inputs->'preferred_project_types')<>'array' THEN RAISE EXCEPTION 'invalid_inputs'; END IF;
   IF jsonb_array_length(_inputs->'preferred_project_types')>30 OR EXISTS(SELECT 1 FROM jsonb_array_elements(_inputs->'preferred_project_types') v WHERE jsonb_typeof(v)<>'string' OR length(v#>>'{}')>160) THEN RAISE EXCEPTION 'invalid_inputs'; END IF;
  END IF;
  SELECT business_name INTO company FROM contractors_prospects WHERE id=_prospect_id;
  clean=jsonb_build_object('company_name',company,'trade_primary',left(_inputs->>'trade_primary',160),'city',left(_inputs->>'city',160),'trade_secondary',left(_inputs->>'trade_secondary',160),'preferred_project_types',_inputs->'preferred_project_types','target_monthly_appointments',_inputs->'target_monthly_appointments','monthly_capacity',_inputs->'monthly_capacity','average_project_value',_inputs->'average_project_value','close_rate_estimate',_inputs->'close_rate_estimate','service_radius_km',_inputs->'service_radius_km');
  IF _offer_type='personnalise' AND (coalesce(clean->>'trade_primary','')='' OR coalesce(clean->>'city','')='' OR NOT coalesce((clean->>'target_monthly_appointments')::numeric BETWEEN 1 AND 1000,false) OR NOT coalesce((clean->>'monthly_capacity')::numeric BETWEEN 1 AND 1000,false) OR NOT coalesce((clean->>'average_project_value')::numeric BETWEEN 1 AND 10000000,false) OR NOT coalesce((clean->>'close_rate_estimate')::numeric BETWEEN 0.01 AND 1,false)) THEN RAISE EXCEPTION 'invalid_inputs'; END IF;
  IF p.id IS NOT NULL AND (p.paid_at IS NOT NULL OR p.used_at IS NOT NULL) THEN RAISE EXCEPTION 'proposal_locked'; END IF;
  token=coalesce(p.client_draft_token,encode(gen_random_bytes(32),'hex'));
  IF p.id IS NULL THEN
   INSERT INTO affiliate_proposals(affiliate_id,prospect_id,recommended_plan_slug,monthly_price_cents,token_hash,client_draft_token,payload)
   VALUES(a.user_id,_prospect_id,_offer_type,0,encode(digest(token,'sha256'),'hex'),token,jsonb_build_object('draft_version','1','offer_type',_offer_type,'ref',a.referral_code,'affiliate_entity_id',a.id,'company_name',company,'inputs',clean,'ready_at',now())) RETURNING * INTO p;
  ELSE
   UPDATE affiliate_proposals SET recommended_plan_slug=_offer_type,client_draft_token=token,payload=payload||jsonb_build_object('offer_type',_offer_type,'inputs',clean,'company_name',company,'ready_at',now()) WHERE id=p.id RETURNING * INTO p;
  END IF;
 ELSIF _action<>'get' THEN RAISE EXCEPTION 'invalid_action'; END IF;
 IF p.id IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',p.id,'prospect_id',p.prospect_id,'affiliate_entity_id',p.payload->>'affiliate_entity_id','offer_type',p.payload->>'offer_type','token',p.client_draft_token,'ref',p.payload->>'ref','company_name',p.payload->>'company_name','inputs',p.payload->'inputs','expires_at',p.expires_at);
END $$;
REVOKE ALL ON FUNCTION public.affiliate_proposal_draft(text,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.affiliate_proposal_draft(text,uuid,text,jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.resolve_affiliate_proposal_context(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE p public.affiliate_proposals%rowtype;
BEGIN
 IF _token IS NULL OR _token !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid_token'; END IF;
 SELECT * INTO p FROM affiliate_proposals WHERE token_hash=encode(digest(_token,'sha256'),'hex') AND expires_at>now() AND payload->>'draft_version'='1';
 IF p.id IS NULL OR p.used_at IS NOT NULL OR p.paid_at IS NOT NULL THEN RAISE EXCEPTION 'expired_or_invalid'; END IF;
 IF NOT EXISTS(SELECT 1 FROM affiliates a JOIN affiliate_assignments s ON s.affiliate_id=a.id WHERE a.id=(p.payload->>'affiliate_entity_id')::uuid AND a.user_id=p.affiliate_id AND a.status='active' AND s.prospect_id=p.prospect_id) THEN RAISE EXCEPTION 'assignment_required'; END IF;
 RETURN jsonb_build_object('id',p.id,'prospect_id',p.prospect_id,'affiliate_entity_id',p.payload->>'affiliate_entity_id','offer_type',p.payload->>'offer_type','ref',p.payload->>'ref','company_name',p.payload->>'company_name','inputs',p.payload->'inputs','expires_at',p.expires_at);
END $$;
REVOKE ALL ON FUNCTION public.resolve_affiliate_proposal_context(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_affiliate_proposal_context(text) TO anon,authenticated,service_role;

-- The legacy resolver never receives the bearer: it is not in payload.
-- Block direct client writes only for the new draft version; legacy rights stay unchanged.
CREATE OR REPLACE FUNCTION public.guard_affiliate_draft_write()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user NOT IN ('postgres','service_role') AND
   ((TG_OP<>'INSERT' AND OLD.payload->>'draft_version'='1') OR
    (TG_OP<>'DELETE' AND (NEW.payload->>'draft_version'='1' OR NEW.client_draft_token IS NOT NULL))) THEN
   RAISE EXCEPTION 'draft_rpc_required' USING ERRCODE='42501';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_affiliate_draft_write BEFORE INSERT OR UPDATE OR DELETE ON public.affiliate_proposals
FOR EACH ROW EXECUTE FUNCTION public.guard_affiliate_draft_write();
REVOKE ALL ON FUNCTION public.guard_affiliate_draft_write() FROM PUBLIC,anon,authenticated;
