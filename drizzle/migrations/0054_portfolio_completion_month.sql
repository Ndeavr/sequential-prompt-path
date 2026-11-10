-- Optional, declared "month and year of completion" for a free portfolio project (never inferred from EXIF).
ALTER TABLE public.contractor_portfolio_projects ADD COLUMN IF NOT EXISTS completed_month date NULL;
ALTER TABLE public.contractor_portfolio_projects DROP CONSTRAINT IF EXISTS contractor_portfolio_projects_completed_month_chk;
ALTER TABLE public.contractor_portfolio_projects ADD CONSTRAINT contractor_portfolio_projects_completed_month_chk
  CHECK (completed_month IS NULL OR (completed_month = date_trunc('month', completed_month)::date AND completed_month >= DATE '1950-01-01'));

-- Author-only, while pending: set or clear the declared completion month.
CREATE OR REPLACE FUNCTION public.set_portfolio_project_completion(p_id uuid, p_month date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.contractor_portfolio_projects%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_row FROM public.contractor_portfolio_projects WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_row.submitted_by IS DISTINCT FROM v_uid OR NOT public.owns_contractor(v_row.contractor_id) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'not_pending'; END IF;
  IF p_month IS NOT NULL AND (p_month <> date_trunc('month', p_month)::date OR p_month < DATE '1950-01-01'
      OR p_month > date_trunc('month', (now() AT TIME ZONE 'America/Toronto'))::date) THEN
    RAISE EXCEPTION 'invalid_completion_month';
  END IF;
  UPDATE public.contractor_portfolio_projects SET completed_month = p_month, updated_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'completed_month', p_month);
END $$;
REVOKE ALL ON FUNCTION public.set_portfolio_project_completion(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_portfolio_project_completion(uuid, date) TO authenticated, service_role;

-- Display/ordering metadata for APPROVED, published projects only: declared month + opaque author key (diversity, no identity).
CREATE OR REPLACE FUNCTION public.public_portfolio_feed_meta(p_ids uuid[])
RETURNS TABLE(id uuid, completed_month date, author_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.completed_month, md5('portfolio-author:' || p.contractor_id::text)
  FROM public.contractor_portfolio_projects p
  WHERE p.id = ANY (p_ids[1:50]) AND p.status = 'approved' AND p.published_at IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.public_portfolio_feed_meta(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_portfolio_feed_meta(uuid[]) TO anon, authenticated, service_role;