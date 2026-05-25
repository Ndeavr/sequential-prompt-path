-- ─────────────────────────────────────────────────────────────────────────────
-- Phase B: outbound landing + paid + published tracking
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Extend outbound_landing_pages
ALTER TABLE public.outbound_landing_pages
  ADD COLUMN IF NOT EXISTS landing_token text,
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_session_id text,
  ADD COLUMN IF NOT EXISTS checkout_plan_code text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_contractor_id uuid,
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS aipp_score_snapshot jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_lp_slug_unique ON public.outbound_landing_pages(page_slug);
CREATE INDEX IF NOT EXISTS idx_outbound_lp_publish_status ON public.outbound_landing_pages(publish_status);
CREATE INDEX IF NOT EXISTS idx_outbound_lp_paid_at ON public.outbound_landing_pages(paid_at DESC NULLS LAST);

-- 2) Extend outbound_leads
ALTER TABLE public.outbound_leads
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_session_id text,
  ADD COLUMN IF NOT EXISTS checkout_plan_code text,
  ADD COLUMN IF NOT EXISTS published_contractor_id uuid,
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_outbound_leads_paid ON public.outbound_leads(paid_at DESC NULLS LAST);

-- 3) Auto-create landing page on lead insert
CREATE OR REPLACE FUNCTION public.create_outbound_landing_for_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company record;
  v_slug text;
  v_token text;
  v_existing uuid;
BEGIN
  -- Skip if landing already exists for this lead
  SELECT id INTO v_existing FROM public.outbound_landing_pages WHERE lead_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, company_slug, company_name, city, specialty, trade
    INTO v_company
    FROM public.outbound_companies
    WHERE id = NEW.company_id;

  IF v_company.id IS NULL THEN
    RETURN NEW;
  END IF;

  v_slug := COALESCE(v_company.company_slug, 'pro')
            || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  v_token := encode(gen_random_bytes(18), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.outbound_landing_pages (
    company_id, lead_id, page_slug, landing_token,
    city, specialty, language, page_status
  ) VALUES (
    v_company.id, NEW.id, v_slug, v_token,
    v_company.city, COALESCE(v_company.specialty, v_company.trade), 'fr', 'live'
  )
  ON CONFLICT (page_slug) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_outbound_landing ON public.outbound_leads;
CREATE TRIGGER trg_create_outbound_landing
AFTER INSERT ON public.outbound_leads
FOR EACH ROW EXECUTE FUNCTION public.create_outbound_landing_for_lead();

-- 4) Backfill landing pages for existing leads without one
INSERT INTO public.outbound_landing_pages (company_id, lead_id, page_slug, landing_token, city, specialty, language, page_status)
SELECT
  l.company_id,
  l.id,
  COALESCE(c.company_slug, 'pro') || '-' || substr(replace(l.id::text, '-', ''), 1, 6),
  replace(replace(replace(encode(gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'), '=', ''),
  c.city,
  COALESCE(c.specialty, c.trade),
  'fr',
  'live'
FROM public.outbound_leads l
JOIN public.outbound_companies c ON c.id = l.company_id
WHERE NOT EXISTS (SELECT 1 FROM public.outbound_landing_pages lp WHERE lp.lead_id = l.id)
ON CONFLICT (page_slug) DO NOTHING;

-- 5) Backfill landing_token for any landing pages missing one
UPDATE public.outbound_landing_pages
SET landing_token = replace(replace(replace(encode(gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'), '=', '')
WHERE landing_token IS NULL;

-- 6) Public resolve RPC (called by edge fn with anon key; SECURITY DEFINER scope-limited)
CREATE OR REPLACE FUNCTION public.outbound_resolve_landing(p_slug text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landing record;
  v_company record;
  v_lead record;
  v_score jsonb;
  v_personalization jsonb;
BEGIN
  SELECT * INTO v_landing
    FROM public.outbound_landing_pages
    WHERE page_slug = p_slug AND landing_token = p_token
    LIMIT 1;

  IF v_landing.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Bump view counters
  UPDATE public.outbound_landing_pages
  SET view_count = view_count + 1,
      first_viewed_at = COALESCE(first_viewed_at, now()),
      last_viewed_at = now()
  WHERE id = v_landing.id;

  SELECT * INTO v_company FROM public.outbound_companies WHERE id = v_landing.company_id;
  SELECT * INTO v_lead FROM public.outbound_leads WHERE id = v_landing.lead_id;

  -- Most recent AIPP score
  SELECT to_jsonb(s) INTO v_score
    FROM public.outbound_ai_scores s
    WHERE s.lead_id = v_landing.lead_id
    ORDER BY s.created_at DESC NULLS LAST
    LIMIT 1;

  -- Most recent personalization
  SELECT to_jsonb(p) INTO v_personalization
    FROM public.outbound_ai_personalizations p
    WHERE p.lead_id = v_landing.lead_id
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 1;

  -- Log view event
  INSERT INTO public.outbound_events (lead_id, event_type, event_value, event_payload)
  VALUES (v_landing.lead_id, 'landing_view', p_slug, jsonb_build_object('view_count', v_landing.view_count + 1));

  RETURN jsonb_build_object(
    'landing', to_jsonb(v_landing),
    'company', to_jsonb(v_company),
    'lead', to_jsonb(v_lead),
    'score', v_score,
    'personalization', v_personalization
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.outbound_resolve_landing(text, text) TO anon, authenticated;

-- 7) Funnel view
CREATE OR REPLACE VIEW public.v_outbound_funnel
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', l.created_at)::date AS day,
  c.trade,
  c.city,
  count(*) FILTER (WHERE l.id IS NOT NULL) AS leads_total,
  count(*) FILTER (WHERE l.last_contacted_at IS NOT NULL) AS leads_sent,
  count(*) FILTER (WHERE lp.first_viewed_at IS NOT NULL) AS landing_viewed,
  count(*) FILTER (WHERE lp.checkout_started_at IS NOT NULL) AS checkout_started,
  count(*) FILTER (WHERE lp.paid_at IS NOT NULL) AS paid,
  count(*) FILTER (WHERE lp.publish_status = 'published') AS published
FROM public.outbound_leads l
JOIN public.outbound_companies c ON c.id = l.company_id
LEFT JOIN public.outbound_landing_pages lp ON lp.lead_id = l.id
GROUP BY 1, 2, 3;

GRANT SELECT ON public.v_outbound_funnel TO authenticated;