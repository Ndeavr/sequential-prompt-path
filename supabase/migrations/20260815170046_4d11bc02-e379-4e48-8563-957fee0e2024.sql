CREATE TABLE IF NOT EXISTS public.places_external_call_budget (
  provider text NOT NULL,
  budget_date date NOT NULL,
  calls_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, budget_date)
);

GRANT SELECT ON public.places_external_call_budget TO authenticated;
GRANT ALL ON public.places_external_call_budget TO service_role;

ALTER TABLE public.places_external_call_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read places budget"
ON public.places_external_call_budget
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages places budget"
ON public.places_external_call_budget
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Hard, server-side daily cap. Cannot be raised by any request parameter.
CREATE OR REPLACE FUNCTION public.reserve_places_external_call(p_provider text DEFAULT 'google_places')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit constant integer := 25;
  v_date date := (now() AT TIME ZONE 'America/Toronto')::date;
  v_used integer;
  v_allowed boolean := false;
BEGIN
  INSERT INTO public.places_external_call_budget AS b (provider, budget_date, calls_used)
  VALUES (p_provider, v_date, 1)
  ON CONFLICT (provider, budget_date) DO UPDATE
    SET calls_used = b.calls_used + 1,
        updated_at = now()
    WHERE b.calls_used < v_limit
  RETURNING b.calls_used INTO v_used;

  IF v_used IS NOT NULL THEN
    v_allowed := true;
  ELSE
    SELECT calls_used INTO v_used
    FROM public.places_external_call_budget
    WHERE provider = p_provider AND budget_date = v_date;
    v_used := COALESCE(v_used, v_limit);
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'calls_used', v_used,
    'daily_limit', v_limit,
    'budget_date', v_date,
    'resets_at', ((v_date + 1)::timestamp AT TIME ZONE 'America/Toronto')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_places_external_call(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_places_external_call(text) TO service_role;

CREATE OR REPLACE FUNCTION public.places_budget_status(p_provider text DEFAULT 'google_places')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'provider', p_provider,
    'budget_date', (now() AT TIME ZONE 'America/Toronto')::date,
    'calls_used', COALESCE((
      SELECT calls_used FROM public.places_external_call_budget
      WHERE provider = p_provider
        AND budget_date = (now() AT TIME ZONE 'America/Toronto')::date
    ), 0),
    'daily_limit', 25
  );
$$;

REVOKE ALL ON FUNCTION public.places_budget_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.places_budget_status(text) TO authenticated, service_role;