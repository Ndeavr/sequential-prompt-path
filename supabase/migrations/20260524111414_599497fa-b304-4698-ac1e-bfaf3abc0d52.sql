
-- 1) Backfill RPC: copy contractor_prospects into sniper_targets
CREATE OR REPLACE FUNCTION public.backfill_prospects_to_sniper()
RETURNS TABLE(imported integer, skipped integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imported integer := 0;
  v_skipped integer := 0;
  r record;
  v_channel text;
BEGIN
  FOR r IN
    SELECT * FROM public.contractor_prospects
    WHERE (email IS NOT NULL OR phone IS NOT NULL)
      AND do_not_contact = false
  LOOP
    -- skip if a sniper_target already exists for same name+city
    IF EXISTS (
      SELECT 1 FROM public.sniper_targets
      WHERE lower(business_name) = lower(coalesce(r.business_name, ''))
        AND lower(coalesce(city, '')) = lower(coalesce(r.city, ''))
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_channel := CASE
      WHEN r.email IS NOT NULL AND r.phone IS NOT NULL THEN 'email'
      WHEN r.email IS NOT NULL THEN 'email'
      ELSE 'sms'
    END;

    INSERT INTO public.sniper_targets (
      business_name, legal_name, category, city, province,
      website_url, domain, phone, email, rbq_number, neq_number,
      source_origin, source_reference,
      enrichment_status, identity_status, outreach_status,
      sniper_priority_score, recommended_channel, founder_eligible
    ) VALUES (
      coalesce(r.business_name, 'Entreprise inconnue'),
      r.legal_name,
      coalesce(r.category_slug, r.trade),
      r.city,
      coalesce(r.province, 'QC'),
      r.website_url,
      CASE WHEN r.website_url IS NOT NULL
        THEN regexp_replace(lower(r.website_url), '^https?://(www\.)?([^/]+).*$', '\2')
        ELSE NULL END,
      r.phone,
      r.email,
      r.rbq,
      r.neq,
      coalesce(r.source, 'contractor_prospects_backfill'),
      jsonb_build_object('prospect_id', r.id, 'discovery_method', r.discovery_method),
      'enriched',
      'unresolved',
      'not_started',
      72.00,
      v_channel,
      false
    );
    v_imported := v_imported + 1;
  END LOOP;

  RETURN QUERY SELECT v_imported, v_skipped;
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_prospects_to_sniper() TO service_role;

-- 2) Seed verified Resend mailbox (alex@notify.unpro.ca)
INSERT INTO public.outbound_mailboxes (
  id, sender_name, sender_email, sender_title,
  daily_limit, hourly_send_limit, warmup_enabled,
  mailbox_status, auth_status, provider, connection_type,
  domain, reply_to_email, verified_at, provider_label
) VALUES (
  'b0000001-0000-0000-0000-000000000001'::uuid,
  'Alex d''UNPRO',
  'alex@notify.unpro.ca',
  'Concierge UNPRO',
  50, 10, false,
  'verified', 'connected', 'lovable_email', 'api_lovable',
  'notify.unpro.ca', 'bonjour@unpro.ca', now(), 'Lovable Emails'
) ON CONFLICT (id) DO UPDATE SET
  mailbox_status = 'verified',
  auth_status = 'connected',
  provider = 'lovable_email',
  connection_type = 'api_lovable',
  verified_at = now();
