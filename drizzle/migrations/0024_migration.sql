CREATE OR REPLACE FUNCTION public.manual_prospect_detail_for_me(p_prospect_id uuid)
RETURNS TABLE(
  prospect_id uuid, business_name text, legal_name text, category text, city text, region text,
  phone_e164 text, phone_secondary text, phone_line_type text, phone_validation_status text, sms_eligible boolean,
  email text, website_url text, google_business_url text, source text, source_table text,
  rbq_number text, rbq_source_url text,
  outreach_status text, delivery_status text, sms_error_code text, email_failure_reason text,
  last_attempt_at timestamptz, email_sent_at timestamptz, outreach_sent_at timestamptz,
  queue text, assignment_status text, assigned_at timestamptz, attempts integer,
  last_outcome text, last_outcome_at timestamptz, next_action text, due_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.id, v.business_name, v.legal_name, v.category, v.city, v.region,
    v.phone_e164, v.phone_secondary, v.phone_line_type, v.phone_validation_status, v.sms_eligible,
    v.email, v.website_url, v.google_business_url,
    COALESCE(v.source, cp.source), v.source_urls->>'source_table',
    v.rbq_number, v.rbq_source_url,
    v.outreach_status, v.delivery_status, v.sms_error_code, v.email_failure_reason,
    v.last_attempt_at, v.email_sent_at, v.outreach_sent_at,
    a.queue, a.status, a.assigned_at, a.attempts, a.last_outcome, a.last_outcome_at, a.next_action, a.due_at
  FROM public.crm_manual_assignments a
  JOIN public.verified_contractor_prospects v ON v.id = a.prospect_id
  LEFT JOIN public.contractor_prospects cp
    ON v.source_urls->>'source_table' = 'contractor_prospects'
   AND cp.id::text = v.source_urls->>'source_id'
  WHERE a.prospect_id = p_prospect_id
    AND a.status IN ('assigned','in_progress')
    AND auth.uid() IS NOT NULL
    AND (a.owner_user_id = auth.uid() OR public.is_affiliate_owner(a.affiliate_id))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.manual_prospect_detail_for_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manual_prospect_detail_for_me(uuid) TO authenticated, service_role;