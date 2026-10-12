-- P0 2026-10-12: structural guard on agent_outreach_messages.
ALTER TABLE public.agent_outreach_messages DROP CONSTRAINT agent_outreach_messages_status_check;
ALTER TABLE public.agent_outreach_messages ADD CONSTRAINT agent_outreach_messages_status_check
  CHECK (status = ANY (ARRAY['pending','sent','failed','replied','clicked','draft','generating','quarantined','queued','approved']));

CREATE OR REPLACE FUNCTION public.sms_body_issues(p_body text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN coalesce(btrim(p_body),'') = '' THEN 'empty_body' END,
    CASE WHEN p_body ~* '(bonjour|salut|allo|hello|hi)\s+,' THEN 'empty_greeting' END,
    CASE WHEN p_body ~* '\mnull\M' THEN 'null_token' END,
    CASE WHEN p_body ~ '\mundefined\M|\mNaN\M|\[object Object\]' THEN 'undefined_token' END,
    CASE WHEN p_body ~ '\{\{[^}]*\}\}|\$\{[^}]*\}' THEN 'unresolved_template' END
  ], NULL)
$$;

CREATE OR REPLACE FUNCTION public.guard_agent_outreach_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_issues text[]; v_open int;
BEGIN
  -- Invalid bodies never move to a dispatchable status.
  IF NEW.status IN ('pending','queued','approved','sent') AND NEW.channel = 'sms' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.body IS DISTINCT FROM NEW.body THEN
      v_issues := public.sms_body_issues(NEW.body);
      IF array_length(v_issues,1) > 0 THEN
        RAISE EXCEPTION 'sms_body_invalid:%', array_to_string(v_issues, ',') USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  -- Anti-loop: one open row per lead (pending/draft/generating/queued/approved).
  IF TG_OP = 'INSERT' AND NEW.lead_id IS NOT NULL THEN
    SELECT count(*) INTO v_open FROM public.agent_outreach_messages
     WHERE lead_id = NEW.lead_id AND status IN ('pending','draft','generating','queued','approved');
    IF v_open > 0 THEN
      RAISE EXCEPTION 'outreach_open_row_exists' USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_agent_outreach_message ON public.agent_outreach_messages;
CREATE TRIGGER trg_guard_agent_outreach_message
  BEFORE INSERT OR UPDATE ON public.agent_outreach_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_agent_outreach_message();