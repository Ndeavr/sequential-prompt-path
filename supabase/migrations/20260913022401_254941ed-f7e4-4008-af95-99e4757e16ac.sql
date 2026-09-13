
DROP FUNCTION IF EXISTS public.manual_queue_for_me();

CREATE OR REPLACE FUNCTION public.manual_queue_for_me()
RETURNS TABLE(
  assignment_id uuid, prospect_id uuid, business_name text, city text, category text,
  phone_e164 text, email text, website_url text, current_stage text, priority_score integer,
  activation_probability integer, estimated_value_cents integer, blocked_reason text,
  assignment_status text, next_action text, due_at timestamp with time zone, attempts integer,
  last_outcome text, objection text, assigned_at timestamp with time zone, opted_out boolean,
  activation_token text, is_overdue boolean, queue text, contact_locked boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    a.id,
    n.prospect_id,
    n.business_name,
    n.city,
    n.category,
    CASE WHEN a.queue = 'onboarding_recovery' THEN NULL::text ELSE n.phone_e164 END,
    CASE WHEN a.queue = 'onboarding_recovery' THEN NULL::text ELSE n.email END,
    n.website_url,
    n.current_stage,
    n.priority_score,
    n.activation_probability,
    n.estimated_value_cents,
    CASE
      WHEN a.queue = 'onboarding_recovery'
        THEN 'Vérification de conformité requise avant tout contact'
      ELSE n.blocked_reason
    END,
    a.status,
    a.next_action,
    a.due_at,
    a.attempts,
    a.last_outcome,
    a.objection,
    a.assigned_at,
    COALESCE(n.opted_out, false),
    CASE WHEN a.queue = 'onboarding_recovery' THEN NULL::text ELSE (
      SELECT vt.token
      FROM public.verified_prospect_tokens vt
      WHERE vt.prospect_id = n.prospect_id
      ORDER BY vt.created_at DESC
      LIMIT 1
    ) END,
    (a.due_at IS NOT NULL AND a.due_at < now()),
    a.queue,
    (a.queue = 'onboarding_recovery' OR COALESCE(n.opted_out, false))
  FROM public.crm_manual_assignments a
  JOIN public.v_crm_next_action n ON n.prospect_id = a.prospect_id
  WHERE a.status IN ('assigned','in_progress')
    AND (a.owner_user_id = auth.uid() OR public.is_affiliate_owner(a.affiliate_id))
  ORDER BY (a.due_at IS NOT NULL AND a.due_at < now()) DESC, a.priority DESC, n.priority_score DESC;
$function$;

REVOKE ALL ON FUNCTION public.manual_queue_for_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manual_queue_for_me() TO authenticated, service_role;
