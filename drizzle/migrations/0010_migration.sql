CREATE TABLE IF NOT EXISTS public.address_lookup_hits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS address_lookup_hits_key_time ON public.address_lookup_hits (bucket_key, created_at);
ALTER TABLE public.address_lookup_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.address_lookup_hits FROM anon, authenticated;
GRANT ALL ON public.address_lookup_hits TO service_role;

-- Réservation atomique multi-seaux sur fenêtre glissante de 10 minutes.
-- Tout ou rien : si un seau est plein, rien n'est consommé.
CREATE OR REPLACE FUNCTION public.reserve_address_lookup(p_keys text[], p_limits int[], p_window_seconds int DEFAULT 600)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int; k text; used int; oldest timestamptz; wait int := 0;
  since timestamptz := now() - make_interval(secs => p_window_seconds);
BEGIN
  IF p_keys IS NULL OR array_length(p_keys,1) IS NULL OR array_length(p_keys,1) <> array_length(p_limits,1) THEN
    RAISE EXCEPTION 'invalid buckets';
  END IF;
  FOR k IN SELECT unnest(p_keys) ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('addr:' || k, 0));
  END LOOP;
  FOR i IN 1..array_length(p_keys,1) LOOP
    SELECT count(*), min(created_at) INTO used, oldest
      FROM public.address_lookup_hits WHERE bucket_key = p_keys[i] AND created_at > since;
    IF used >= p_limits[i] THEN
      wait := greatest(wait, ceil(extract(epoch FROM (oldest + make_interval(secs => p_window_seconds) - now())))::int);
    END IF;
  END LOOP;
  IF wait > 0 THEN
    RETURN jsonb_build_object('allowed', false, 'retry_after_seconds', greatest(wait,1));
  END IF;
  INSERT INTO public.address_lookup_hits (bucket_key) SELECT unnest(p_keys);
  DELETE FROM public.address_lookup_hits WHERE bucket_key = ANY(p_keys) AND created_at < now() - interval '1 hour';
  RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
END $$;
REVOKE ALL ON FUNCTION public.reserve_address_lookup(text[], int[], int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_address_lookup(text[], int[], int) TO service_role;