
-- 1. Add rendered output + CTA columns to contractor_outreach_logs
ALTER TABLE public.contractor_outreach_logs
  ADD COLUMN IF NOT EXISTS rendered_html text,
  ADD COLUMN IF NOT EXISTS rendered_text text,
  ADD COLUMN IF NOT EXISTS raw_template jsonb,
  ADD COLUMN IF NOT EXISTS cta_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_tracked_cta boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS contractor_outreach_logs_has_tracked_cta_idx
  ON public.contractor_outreach_logs(has_tracked_cta) WHERE channel = 'email';

-- 2. Same columns on outreach_messages (the other email source)
ALTER TABLE public.outreach_messages
  ADD COLUMN IF NOT EXISTS rendered_html text,
  ADD COLUMN IF NOT EXISTS cta_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_tracked_cta boolean NOT NULL DEFAULT false;

-- 3. Audit findings (30-day scan results)
CREATE TABLE IF NOT EXISTS public.email_cta_audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  template_key text,
  total_emails integer NOT NULL DEFAULT 0,
  count_no_url integer NOT NULL DEFAULT 0,
  count_direct_url integer NOT NULL DEFAULT 0,
  count_tracked_url integer NOT NULL DEFAULT 0,
  sample_message_ids uuid[] NOT NULL DEFAULT '{}',
  root_cause text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.email_cta_audit_findings TO authenticated;
GRANT ALL ON public.email_cta_audit_findings TO service_role;
ALTER TABLE public.email_cta_audit_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email cta audit"
  ON public.email_cta_audit_findings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages email cta audit"
  ON public.email_cta_audit_findings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. Health view (deduped per email)
CREATE OR REPLACE VIEW public.v_email_cta_health
WITH (security_invoker = true) AS
WITH base AS (
  SELECT id, template_key, message_subject, to_address, sent_at, status,
         cta_urls, has_tracked_cta, clicked_at,
         CASE
           WHEN cta_urls IS NULL OR array_length(cta_urls,1) IS NULL THEN 'no_url'
           WHEN has_tracked_cta THEN 'tracked'
           ELSE 'direct'
         END AS cta_class
  FROM public.contractor_outreach_logs
  WHERE channel = 'email'
)
SELECT
  date_trunc('day', sent_at)::date AS day,
  template_key,
  COUNT(*) AS sent,
  COUNT(*) FILTER (WHERE cta_class = 'tracked') AS with_tracked_cta,
  COUNT(*) FILTER (WHERE cta_class = 'direct')  AS with_direct_url,
  COUNT(*) FILTER (WHERE cta_class = 'no_url')  AS missing_cta,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked,
  ROUND(100.0 * COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)
        / NULLIF(COUNT(*) FILTER (WHERE cta_class = 'tracked'), 0), 2) AS ctr_pct
FROM base
WHERE sent_at >= now() - interval '60 days'
GROUP BY 1, 2
ORDER BY 1 DESC;

GRANT SELECT ON public.v_email_cta_health TO authenticated;
