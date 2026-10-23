CREATE TABLE IF NOT EXISTS public.outreach_email_claims (
  idempotency_key text PRIMARY KEY,
  recipient_email text NOT NULL,
  campaign text NOT NULL,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','sent','failed_retryable','failed_final')),
  attempts integer NOT NULL DEFAULT 1,
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outreach_email_claims_recipient ON public.outreach_email_claims (recipient_email, created_at DESC);
GRANT ALL ON public.outreach_email_claims TO service_role;
GRANT SELECT ON public.outreach_email_claims TO authenticated;
ALTER TABLE public.outreach_email_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read outreach email claims" ON public.outreach_email_claims;
CREATE POLICY "admins read outreach email claims" ON public.outreach_email_claims
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Atomic claim before any provider call. One send per recipient+campaign,
-- a 7-day cross-campaign cooldown per recipient, max 3 attempts, 30 min
-- between retries, hard cap 25 commercial emails per America/Toronto day.
CREATE OR REPLACE FUNCTION public.claim_outreach_email(p_key text, p_recipient text, p_campaign text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.outreach_email_claims%ROWTYPE; v_email text := lower(trim(p_recipient)); v_day_count int;
BEGIN
  IF p_key IS NULL OR v_email IS NULL OR v_email = '' OR p_campaign IS NULL THEN RETURN 'invalid'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('outreach_email:' || v_email));
  SELECT * INTO r FROM public.outreach_email_claims WHERE idempotency_key = p_key FOR UPDATE;
  IF FOUND THEN
    IF r.status = 'sent' THEN RETURN 'duplicate_sent'; END IF;
    IF r.status = 'sending' THEN RETURN 'duplicate_in_flight'; END IF;
    IF r.status = 'failed_final' OR r.attempts >= 3 THEN RETURN 'retry_exhausted'; END IF;
    IF r.updated_at > now() - interval '30 minutes' THEN RETURN 'retry_too_soon'; END IF;
    UPDATE public.outreach_email_claims SET status='sending', attempts=attempts+1, updated_at=now() WHERE idempotency_key=p_key;
    RETURN 'claimed_retry';
  END IF;
  IF EXISTS (SELECT 1 FROM public.outreach_email_claims WHERE recipient_email=v_email AND status IN ('sent','sending') AND created_at > now() - interval '7 days') THEN
    RETURN 'recipient_cooldown';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('outreach_email_daily_cap'));
  SELECT count(*) INTO v_day_count FROM public.outreach_email_claims
   WHERE status IN ('sent','sending') AND (created_at AT TIME ZONE 'America/Toronto')::date = (now() AT TIME ZONE 'America/Toronto')::date;
  IF v_day_count >= 25 THEN RETURN 'daily_cap_reached'; END IF;
  INSERT INTO public.outreach_email_claims (idempotency_key, recipient_email, campaign) VALUES (p_key, v_email, p_campaign);
  RETURN 'claimed';
END $$;

CREATE OR REPLACE FUNCTION public.settle_outreach_email(p_key text, p_status text, p_provider_id text, p_error text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.outreach_email_claims SET status=p_status, provider_message_id=COALESCE(p_provider_id, provider_message_id),
    last_error=p_error, updated_at=now()
  WHERE idempotency_key=p_key AND status='sending' AND p_status IN ('sent','failed_retryable','failed_final');
$$;
REVOKE ALL ON FUNCTION public.claim_outreach_email(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_outreach_email(text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outreach_email(text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_outreach_email(text,text,text,text) TO service_role;