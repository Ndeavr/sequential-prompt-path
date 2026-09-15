CREATE OR REPLACE FUNCTION public.contractor_busy_windows(
  p_contractor_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.starts_at, p.ends_at
  FROM public.calendar_busy_periods p
  JOIN public.contractors c ON c.user_id = p.user_id
  WHERE c.id = p_contractor_id
    AND p.ends_at > COALESCE(p_from, now())
    AND p.starts_at < COALESCE(p_to, now() + interval '90 days')
  ORDER BY p.starts_at
  LIMIT 2000;
$$;

REVOKE ALL ON FUNCTION public.contractor_busy_windows(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contractor_busy_windows(uuid, timestamptz, timestamptz) TO anon, authenticated, service_role;