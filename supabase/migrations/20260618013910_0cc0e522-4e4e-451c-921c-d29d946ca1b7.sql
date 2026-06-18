
CREATE TABLE public.admin_page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  path text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_page_visits_path_time ON public.admin_page_visits (path, visited_at DESC);
CREATE INDEX idx_admin_page_visits_user ON public.admin_page_visits (admin_user_id, visited_at DESC);

GRANT SELECT, INSERT ON public.admin_page_visits TO authenticated;
GRANT ALL ON public.admin_page_visits TO service_role;

ALTER TABLE public.admin_page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins insert their own visits"
  ON public.admin_page_visits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = admin_user_id AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all visits"
  ON public.admin_page_visits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_admin_page_stats(days integer DEFAULT 30)
RETURNS TABLE(path text, visits bigint, last_visited timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT path, COUNT(*)::bigint AS visits, MAX(visited_at) AS last_visited
  FROM public.admin_page_visits
  WHERE visited_at >= now() - (days || ' days')::interval
  GROUP BY path
  ORDER BY visits DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_page_stats(integer) TO authenticated;
