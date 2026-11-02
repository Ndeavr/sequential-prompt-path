-- Automated CASL decision path (founder decision 2026-11-02), separate from human signatures.
CREATE TABLE public.casl_campaign_policies (
  campaign_key text PRIMARY KEY,
  offer_code text NOT NULL,
  channel_scope text[] NOT NULL DEFAULT ARRAY['email'],
  active boolean NOT NULL DEFAULT false,
  offer_operational boolean NOT NULL DEFAULT false,
  season_services text[] NOT NULL DEFAULT '{}',
  territories text[] NOT NULL DEFAULT '{}',
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.casl_campaign_policies TO authenticated;
GRANT ALL ON public.casl_campaign_policies TO service_role;
ALTER TABLE public.casl_campaign_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read campaign policies" ON public.casl_campaign_policies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.casl_machine_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES public.casl_consent_evidence(id),
  campaign_key text NOT NULL REFERENCES public.casl_campaign_policies(campaign_key),
  destination_type text NOT NULL,
  destination_normalized text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('auto_validated','priority_review','hold','blocked')),
  policy_version text NOT NULL,
  actor text NOT NULL DEFAULT 'machine:casl-policy',
  legal_reasons text[] NOT NULL DEFAULT '{}',
  block_reasons text[] NOT NULL DEFAULT '{}',
  commercial_score integer NOT NULL DEFAULT 0,
  commercial_breakdown jsonb NOT NULL DEFAULT '{}',
  inputs jsonb NOT NULL,
  inputs_sha256 text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evidence_id, campaign_key, policy_version, inputs_sha256)
);
CREATE INDEX casl_machine_decisions_dest_idx ON public.casl_machine_decisions (destination_normalized, campaign_key, created_at DESC);
CREATE INDEX casl_machine_decisions_decision_idx ON public.casl_machine_decisions (decision, created_at DESC);
GRANT SELECT ON public.casl_machine_decisions TO authenticated;
GRANT ALL ON public.casl_machine_decisions TO service_role;
ALTER TABLE public.casl_machine_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read machine decisions" ON public.casl_machine_decisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.casl_machine_decisions_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'casl_machine_decisions is append-only'; END $$;
CREATE TRIGGER trg_casl_machine_decisions_append_only BEFORE UPDATE OR DELETE ON public.casl_machine_decisions
  FOR EACH ROW EXECUTE FUNCTION public.casl_machine_decisions_append_only();

CREATE OR REPLACE FUNCTION public._casl_host(u text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(lower(substring(coalesce(u,'') from '^https://([^/:?#]+)')), '^www\.', '')
$$;

-- Strict machine evaluator. Never writes reviewer_id; service/owner only.
CREATE OR REPLACE FUNCTION public.casl_machine_evaluate(p_evidence_id uuid, p_campaign_key text, p_capture jsonb, p_dry_run boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_policy constant text := 'casl-machine-v1';
  e public.casl_consent_evidence%ROWTYPE;
  c public.casl_campaign_policies%ROWTYPE;
  p record;
  b text[] := '{}'; a text[] := '{}';
  v_dest text; v_domain text; v_ret timestamptz; v_extract text;
  s_season int := 0; s_terr int := 0; s_fit int := 0; v_score int;
  v_decision text; v_exp timestamptz; v_sha text; v_id uuid; v_row public.casl_machine_decisions%ROWTYPE;
BEGIN
  IF NOT (coalesce(auth.role(),'') = 'service_role' OR session_user IN ('postgres','supabase_admin')) THEN
    RAISE EXCEPTION 'casl_machine_evaluate_service_only';
  END IF;
  SELECT * INTO e FROM public.casl_consent_evidence WHERE id = p_evidence_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'casl_evidence_not_found'; END IF;
  IF e.reviewer_id IS NOT NULL THEN
    RETURN jsonb_build_object('decision','human_signed','recorded',false,'reasons',ARRAY['Décision humaine déjà signée : aucune décision machine']);
  END IF;
  p_capture := coalesce(p_capture, '{}'::jsonb);
  SELECT * INTO c FROM public.casl_campaign_policies WHERE campaign_key = p_campaign_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'casl_campaign_unknown'; END IF;
  SELECT id, normalized_domain, city, trade, category_slug, do_not_contact INTO p
    FROM public.contractor_prospects WHERE id = e.contractor_prospect_id;
  v_dest := lower(btrim(e.destination_normalized));
  v_domain := regexp_replace(lower(coalesce(p.normalized_domain,'')), '^www\.', '');

  -- Hard exclusions (never overridden by score)
  IF e.invalidated_at IS NOT NULL OR (NOT e.is_valid AND coalesce(e.verification_method,'') <> 'automated_fetch_pending_human_review') THEN b := b || 'Preuve invalidée'; END IF;
  IF e.refusal_statement_found THEN b := b || 'Refus de sollicitation publié'; END IF;
  IF (p_capture->>'refusal_found') = 'true' THEN b := b || 'Refus détecté à la capture'; END IF;
  IF p.id IS NOT NULL AND coalesce(p.do_not_contact,false) THEN b := b || 'Fiche marquée ne pas contacter'; END IF;
  IF e.destination_type = 'email' THEN
    IF public.is_email_suppressed(v_dest) IS DISTINCT FROM false OR EXISTS (SELECT 1 FROM public.suppressed_emails WHERE lower(email) = v_dest) THEN b := b || 'Courriel désabonné ou supprimé'; END IF;
  ELSIF e.destination_type IN ('phone_sms','phone') THEN
    IF EXISTS (SELECT 1 FROM public.sms_opt_outs WHERE normalized_phone IN (e.destination_normalized, regexp_replace(e.destination_normalized,'\D','','g')))
       OR public.is_phone_suppressed(e.destination_normalized) IS DISTINCT FROM false THEN b := b || 'Numéro STOP ou supprimé'; END IF;
  END IF;

  -- Legal completeness (any gap = ambiguous, never validated)
  IF p.id IS NULL THEN a := a || 'Fiche entreprise non liée'; END IF;
  IF NOT c.active THEN a := a || 'Campagne inactive'; END IF;
  IF NOT (e.destination_type = ANY (c.channel_scope)) AND NOT (e.destination_type = 'phone' AND 'phone_sms' = ANY (c.channel_scope)) THEN a := a || 'Canal hors campagne'; END IF;
  IF e.lawful_basis IS DISTINCT FROM 'implicit_public_conspicuous' THEN a := a || 'Base légale non prise en charge par la machine'; END IF;
  IF coalesce(e.source_type,'') NOT IN ('company_website','first_party_website') THEN a := a || 'Source tierce (annuaire, reproduction)'; END IF;
  IF e.source_url IS NULL OR e.source_url !~* '^https://' THEN a := a || 'Source HTTPS manquante'; END IF;
  IF v_domain = '' OR public._casl_host(e.source_url) IS DISTINCT FROM v_domain THEN a := a || 'Source hors domaine officiel confirmé'; END IF;
  IF public._casl_host(p_capture->>'final_url') IS DISTINCT FROM v_domain THEN a := a || 'Redirection ou domaine final non vérifié'; END IF;
  IF (p_capture->>'http_status') IS DISTINCT FROM '200' THEN a := a || 'Capture HTTP non 200'; END IF;
  IF (p_capture->>'challenge_detected') IS DISTINCT FROM 'false' THEN a := a || 'Robot/challenge ou état inconnu'; END IF;
  IF nullif(p_capture->>'crawl_error','') IS NOT NULL THEN a := a || 'Erreur de capture'; END IF;
  IF coalesce(p_capture->>'page_sha256','') !~ '^[0-9a-f]{64}$' THEN a := a || 'Empreinte SHA-256 complète absente'; END IF;
  v_extract := lower(coalesce(p_capture->>'extract',''));
  IF position(v_dest in v_extract) = 0 THEN a := a || 'Extrait ne contient pas la destination'; END IF;
  IF (p_capture->>'destination_visible') IS DISTINCT FROM 'true' THEN a := a || 'Publication visible non démontrée'; END IF;
  IF (p_capture->>'refusal_found') IS DISTINCT FROM 'false' OR jsonb_array_length(coalesce(p_capture->'refusal_pages_checked','[]'::jsonb)) < 1 THEN a := a || 'Absence de refus non vérifiée'; END IF;
  BEGIN v_ret := (p_capture->>'retrieved_at')::timestamptz; EXCEPTION WHEN others THEN v_ret := NULL; END;
  IF v_ret IS NULL OR v_ret < now() - interval '30 days' OR v_ret > now() + interval '5 minutes' THEN a := a || 'Capture absente ou périmée (>30 j)'; END IF;
  IF e.expires_at IS NOT NULL AND e.expires_at <= now() THEN a := a || 'Preuve expirée'; END IF;
  IF coalesce(length(btrim(e.business_relevance_explanation)),0) < 30 THEN a := a || 'Pertinence non documentée'; END IF;
  IF NOT c.offer_operational THEN a := a || 'Offre de la campagne non opérationnelle'; END IF;
  IF e.destination_type IN ('phone_sms','phone') THEN
    BEGIN
      IF (p_capture->>'mobile_verified_at')::timestamptz IS NULL OR (p_capture->>'mobile_verified_at')::timestamptz < now() - interval '90 days' THEN a := a || 'Mobile non vérifié'; END IF;
    EXCEPTION WHEN others THEN a := a || 'Mobile non vérifié'; END;
  END IF;
  IF NOT p_dry_run AND (p_capture->>'capture_agent') IS DISTINCT FROM 'enrich-official-website' THEN a := a || 'Capture non produite par l''agent officiel'; END IF;

  -- Commercial score v1 (independent of legal proof)
  IF EXISTS (SELECT 1 FROM unnest(c.season_services) s WHERE lower(coalesce(p.trade,'') || ' ' || coalesce(p.category_slug,'')) LIKE '%' || lower(s) || '%') THEN s_season := 40; END IF;
  IF EXISTS (SELECT 1 FROM unnest(c.territories) t WHERE lower(coalesce(p.city,'')) = lower(t)) THEN s_terr := 30; END IF;
  IF coalesce(length(btrim(e.business_relevance_explanation)),0) >= 30 AND c.offer_operational THEN s_fit := 30; END IF;
  v_score := s_season + s_terr + s_fit;

  IF array_length(b,1) > 0 THEN v_decision := 'blocked';
  ELSIF coalesce(array_length(a,1),0) = 0 THEN v_decision := 'auto_validated';
  ELSIF v_score >= 70 THEN v_decision := 'priority_review';
  ELSE v_decision := 'hold'; END IF;
  IF v_decision = 'auto_validated' THEN
    v_exp := LEAST(v_ret + interval '180 days', coalesce(e.expires_at, 'infinity'::timestamptz));
  END IF;

  IF p_dry_run THEN
    RETURN jsonb_build_object('decision',v_decision,'recorded',false,'policy_version',v_policy,'legal_reasons',a,'block_reasons',b,'commercial_score',v_score);
  END IF;

  v_sha := encode(sha256(convert_to(p_capture::text,'UTF8')),'hex');
  PERFORM pg_advisory_xact_lock(hashtext(p_evidence_id::text || '|' || p_campaign_key));
  INSERT INTO public.casl_machine_decisions (evidence_id, campaign_key, destination_type, destination_normalized, decision, policy_version,
      legal_reasons, block_reasons, commercial_score, commercial_breakdown, inputs, inputs_sha256, expires_at)
  VALUES (p_evidence_id, p_campaign_key, e.destination_type, v_dest, v_decision, v_policy, a, b, v_score,
      jsonb_build_object('season',s_season,'territory',s_terr,'offer_fit',s_fit,'threshold',70), p_capture, v_sha, v_exp)
  ON CONFLICT (evidence_id, campaign_key, policy_version, inputs_sha256) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT * INTO v_row FROM public.casl_machine_decisions WHERE evidence_id = p_evidence_id AND campaign_key = p_campaign_key AND policy_version = v_policy AND inputs_sha256 = v_sha;
    RETURN jsonb_build_object('decision',v_row.decision,'recorded',false,'decision_id',v_row.id,'idempotent',true);
  END IF;
  RETURN jsonb_build_object('decision',v_decision,'recorded',true,'decision_id',v_id,'legal_reasons',a,'block_reasons',b,'commercial_score',v_score);
END $$;
REVOKE ALL ON FUNCTION public.casl_machine_evaluate(uuid, text, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.casl_machine_evaluate(uuid, text, jsonb, boolean) TO service_role;

-- Final sender check: human signature OR current machine auto-validation for this exact destination+campaign.
CREATE OR REPLACE FUNCTION public.casl_send_basis(p_destination_type text, p_destinations text[], p_campaign_key text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_types text[]; v_dests text[]; h record; m record;
BEGIN
  IF NOT (coalesce(auth.role(),'') = 'service_role' OR session_user IN ('postgres','supabase_admin')) THEN
    RAISE EXCEPTION 'casl_send_basis_service_only';
  END IF;
  v_types := CASE WHEN p_destination_type = 'email' THEN ARRAY['email'] ELSE ARRAY['phone_sms','phone'] END;
  SELECT array_agg(DISTINCT CASE WHEN p_destination_type='email' THEN lower(btrim(x)) ELSE btrim(x) END) INTO v_dests FROM unnest(p_destinations) x WHERE coalesce(btrim(x),'') <> '';
  IF v_dests IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','no_destination'); END IF;
  IF p_destination_type = 'email' THEN
    IF EXISTS (SELECT 1 FROM unnest(v_dests) d WHERE public.is_email_suppressed(d) IS DISTINCT FROM false)
       OR EXISTS (SELECT 1 FROM public.suppressed_emails s WHERE lower(s.email) = ANY (v_dests)) THEN
      RETURN jsonb_build_object('ok',false,'reason','suppressed');
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.sms_opt_outs o WHERE o.normalized_phone = ANY (v_dests))
       OR EXISTS (SELECT 1 FROM unnest(v_dests) d WHERE public.is_phone_suppressed(d) IS DISTINCT FROM false) THEN
      RETURN jsonb_build_object('ok',false,'reason','opted_out');
    END IF;
  END IF;
  SELECT id INTO h FROM public.casl_consent_evidence
   WHERE destination_type = ANY (v_types) AND destination_normalized = ANY (v_dests) AND is_valid AND reviewer_id IS NOT NULL
     AND lawful_basis IS NOT NULL AND source_url ~* '^https://' AND retrieved_at IS NOT NULL AND NOT refusal_statement_found
     AND (expires_at IS NULL OR expires_at > now())
   ORDER BY created_at DESC LIMIT 1;
  IF h.id IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'basis','human','evidence_id',h.id); END IF;
  IF coalesce(p_campaign_key,'') = '' THEN RETURN jsonb_build_object('ok',false,'reason','no_basis'); END IF;
  SELECT d.id, d.evidence_id INTO m FROM (
      SELECT DISTINCT ON (md.evidence_id) md.* FROM public.casl_machine_decisions md
       WHERE md.campaign_key = p_campaign_key AND md.destination_type = ANY (v_types) AND md.destination_normalized = ANY (v_dests)
       ORDER BY md.evidence_id, md.created_at DESC) d
    JOIN public.casl_consent_evidence e ON e.id = d.evidence_id
    JOIN public.casl_campaign_policies c ON c.campaign_key = d.campaign_key AND c.active AND c.offer_operational
    LEFT JOIN public.contractor_prospects p ON p.id = e.contractor_prospect_id
   WHERE d.decision = 'auto_validated' AND d.expires_at > now() AND e.invalidated_at IS NULL AND NOT e.refusal_statement_found
     AND (e.expires_at IS NULL OR e.expires_at > now()) AND p.id IS NOT NULL AND NOT coalesce(p.do_not_contact,false)
   ORDER BY d.created_at DESC LIMIT 1;
  IF m.id IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'basis','machine','decision_id',m.id,'evidence_id',m.evidence_id); END IF;
  RETURN jsonb_build_object('ok',false,'reason','no_basis');
END $$;
REVOKE ALL ON FUNCTION public.casl_send_basis(text, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.casl_send_basis(text, text[], text) TO service_role;

INSERT INTO public.casl_campaign_policies (campaign_key, offer_code, channel_scope, active, offer_operational, season_services, territories, notes) VALUES
 ('entry350-hiver-2026','entry_activation_350',ARRAY['email'],true,true,ARRAY['conduit','ventilation'],ARRAY['Laval','Terrebonne','Montréal','Mirabel','Blainville'],'Activation unique 350 $ + taxes; aucun RDV inclus.'),
 ('petits-services-gratuit-2026','free_small_service',ARRAY['email'],true,false,ARRAY['abri'],ARRAY['Laval','Terrebonne','Mirabel'],'Coupon/code municipal non vérifiés : offre non opérationnelle.')
ON CONFLICT DO NOTHING;