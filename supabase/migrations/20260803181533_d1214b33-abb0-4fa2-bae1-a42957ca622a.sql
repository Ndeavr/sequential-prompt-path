-- ============ CRM tables ============
CREATE TABLE IF NOT EXISTS public.crm_prospect_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL,
  note text NOT NULL,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_prospect_notes TO authenticated;
GRANT ALL ON public.crm_prospect_notes TO service_role;
ALTER TABLE public.crm_prospect_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_notes_admin_all" ON public.crm_prospect_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.crm_prospect_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL,
  tag text NOT NULL,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, tag)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_prospect_tags TO authenticated;
GRANT ALL ON public.crm_prospect_tags TO service_role;
ALTER TABLE public.crm_prospect_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_tags_admin_all" ON public.crm_prospect_tags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.crm_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid,
  action text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  reason text,
  result text,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.crm_action_log TO authenticated;
GRANT ALL ON public.crm_action_log TO service_role;
ALTER TABLE public.crm_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_action_log_admin_read" ON public.crm_action_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "crm_action_log_admin_write" ON public.crm_action_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_crm_notes_prospect ON public.crm_prospect_notes (prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_tags_prospect ON public.crm_prospect_tags (prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_action_log_prospect ON public.crm_action_log (prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_action_log_created ON public.crm_action_log (created_at DESC);

CREATE TRIGGER trg_crm_notes_updated BEFORE UPDATE ON public.crm_prospect_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_action_log_updated BEFORE UPDATE ON public.crm_action_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CRM superset view ============
CREATE OR REPLACE VIEW public.v_crm_prospects
WITH (security_invoker = on) AS
WITH dup AS (
  SELECT lower(btrim(business_name)) AS key, count(*) AS n
  FROM public.verified_contractor_prospects
  WHERE business_name IS NOT NULL
  GROUP BY 1
), emails AS (
  SELECT prospect_id,
         count(*) AS emails_sent,
         max(created_at) AS last_email_at
  FROM public.crm_action_log
  WHERE action IN ('send_email','onboarding_email','payment_email')
    AND status = 'success'
  GROUP BY prospect_id
), tg AS (
  SELECT prospect_id, array_agg(tag ORDER BY tag) AS tags
  FROM public.crm_prospect_tags GROUP BY prospect_id
)
SELECT
  f.*,
  p.website_url,
  p.rbq_number,
  p.google_business_url,
  p.data_quality_score,
  COALESCE(e.emails_sent, 0)                                     AS emails_sent,
  e.last_email_at,
  COALESCE(t.tags, ARRAY[]::text[])                              AS tags,
  (f.email IS NOT NULL AND f.email <> '')                        AS has_email,
  (f.email IS NULL OR f.email = '')                              AS no_email,
  (p.phone_validation_status IS DISTINCT FROM 'valid'
     AND p.phone_validation_status IS NOT NULL)                  AS phone_invalid,
  (p.website_url IS NULL OR p.website_url = '')                  AS no_website,
  (p.rbq_number IS NULL OR p.rbq_number = '')                    AS missing_rbq,
  (p.google_business_url IS NULL OR p.google_business_url = '')  AS missing_gbp,
  COALESCE(d.n, 1) > 1                                           AS is_duplicate,
  (o.normalized_phone IS NOT NULL)                               AS opted_out,
  (f.paid_at IS NOT NULL AND f.paid_at >= date_trunc('day', now())) AS paid_today,
  (f.paid_at IS NOT NULL AND f.paid_at >= now() - interval '7 days') AS activated_this_week,
  ROUND(EXTRACT(epoch FROM (now() - f.last_activity_at)) / 3600.0)::int AS hours_since_last_activity,
  CASE WHEN f.paid_at IS NULL AND f.clicked_at IS NOT NULL THEN 100 ELSE 0 END AS recoverable_revenue_cents,
  CASE
    WHEN o.normalized_phone IS NOT NULL THEN 0
    WHEN f.paid_at IS NOT NULL THEN 5
    WHEN f.checkout_at IS NOT NULL THEN 95
    WHEN f.registered_at IS NOT NULL OR f.otp_verified_at IS NOT NULL THEN 90
    WHEN f.clicked_at IS NOT NULL OR f.landing_at IS NOT NULL THEN 100
    WHEN f.sms_delivered > 0 AND f.last_activity_at < now() - interval '48 hours' THEN 70
    WHEN f.sms_delivered > 0 THEN 45
    WHEN (f.sms_failed > 0 OR f.sms_undelivered > 0)
         AND f.email IS NOT NULL AND f.email <> '' THEN 60
    WHEN f.sms_failed > 0 OR f.sms_undelivered > 0 THEN 25
    WHEN f.sms_sent > 0 THEN 30
    WHEN f.current_stage IN ('scraped','validated') THEN 40
    ELSE 20
  END                                                            AS priority_score,
  CASE
    WHEN o.normalized_phone IS NOT NULL THEN false
    WHEN f.paid_at IS NOT NULL THEN false
    WHEN f.checkout_at IS NOT NULL THEN true
    WHEN f.registered_at IS NOT NULL THEN true
    WHEN f.clicked_at IS NOT NULL THEN true
    WHEN f.sms_delivered > 0 AND f.last_activity_at < now() - interval '48 hours' THEN true
    WHEN f.sms_failed > 0 OR f.sms_undelivered > 0 THEN true
    ELSE false
  END                                                            AS needs_action,
  LEAST(100, GREATEST(0,
      COALESCE(p.data_quality_score, 40)
    + CASE WHEN f.email IS NOT NULL AND f.email <> '' THEN 15 ELSE 0 END
    + CASE WHEN p.website_url IS NOT NULL AND p.website_url <> '' THEN 10 ELSE 0 END
    + CASE WHEN p.rbq_number IS NOT NULL AND p.rbq_number <> '' THEN 10 ELSE 0 END
    + CASE WHEN f.sms_delivered > 0 THEN 10 ELSE 0 END
    + CASE WHEN f.clicked_at IS NOT NULL THEN 15 ELSE 0 END
  ))::int                                                        AS health_score
FROM public.v_prospect_funnel f
JOIN public.verified_contractor_prospects p ON p.id = f.prospect_id
LEFT JOIN dup d ON d.key = lower(btrim(p.business_name))
LEFT JOIN sms_opt_outs o ON o.normalized_phone = f.phone_e164
LEFT JOIN emails e ON e.prospect_id = f.prospect_id
LEFT JOIN tg t ON t.prospect_id = f.prospect_id;

GRANT SELECT ON public.v_crm_prospects TO authenticated;
GRANT SELECT ON public.v_crm_prospects TO service_role;

-- ============ Timeline function ============
CREATE OR REPLACE FUNCTION public.crm_prospect_timeline(_prospect_id uuid)
RETURNS TABLE (occurred_at timestamptz, kind text, label text, detail text, meta jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.created_at, 'scraped', 'Prospect scrapé', p.source, jsonb_build_object('city', p.city)
  FROM verified_contractor_prospects p WHERE p.id = _prospect_id
  UNION ALL
  SELECT p.verified_at, 'validated', 'Prospect validé', p.phone_validation_status, '{}'::jsonb
  FROM verified_contractor_prospects p WHERE p.id = _prospect_id AND p.verified_at IS NOT NULL
  UNION ALL
  SELECT COALESCE(l.sent_at, l.created_at), 'sms',
         COALESCE(l.relance_kind, 'SMS'), COALESCE(l.status, 'inconnu'),
         jsonb_build_object('sid', l.provider_message_id, 'error', l.error)
  FROM acq_sms_logs l WHERE l.prospect_id = _prospect_id
  UNION ALL
  SELECT t.clicked_at, 'click', 'Clic sur le lien', t.token,
         jsonb_build_object('clicks', t.click_count)
  FROM verified_prospect_tokens t WHERE t.prospect_id = _prospect_id AND t.clicked_at IS NOT NULL
  UNION ALL
  SELECT ev.occurred_at, 'event', ev.event_type, ev.channel, COALESCE(ev.metadata, '{}'::jsonb)
  FROM pipeline_engagement_events ev WHERE ev.prospect_id = _prospect_id
  UNION ALL
  SELECT a.created_at, 'action', a.action, COALESCE(a.result, a.status),
         jsonb_build_object('source', a.source, 'reason', a.reason)
  FROM crm_action_log a WHERE a.prospect_id = _prospect_id
  UNION ALL
  SELECT n.created_at, 'note', 'Note opérateur', n.note, '{}'::jsonb
  FROM crm_prospect_notes n WHERE n.prospect_id = _prospect_id
  ORDER BY 1 DESC
$$;

GRANT EXECUTE ON FUNCTION public.crm_prospect_timeline(uuid) TO authenticated, service_role;