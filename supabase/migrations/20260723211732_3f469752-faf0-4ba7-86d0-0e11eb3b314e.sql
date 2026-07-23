DROP POLICY IF EXISTS "Public read by token" ON public.alex_score_reveal_sessions;
DROP POLICY IF EXISTS "Public update by token" ON public.alex_score_reveal_sessions;

CREATE POLICY "Service role can read score reveal sessions"
ON public.alex_score_reveal_sessions
FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Service role can update score reveal sessions"
ON public.alex_score_reveal_sessions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_alex_score_reveal_session(_session_token text)
RETURNS TABLE (
  id uuid,
  score_global integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.score_global
  FROM public.alex_score_reveal_sessions s
  WHERE s.session_token = _session_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_alex_score_reveal_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_alex_score_reveal_session(text) TO anon, authenticated, service_role;