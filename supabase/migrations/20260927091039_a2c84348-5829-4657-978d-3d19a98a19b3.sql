CREATE OR REPLACE FUNCTION public.adopt_orphan_contractor_for_claim(
  p_user_id uuid,
  p_phone text,
  p_business_name text,
  p_city text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_ids uuid[];
  v_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_digits := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);

  IF length(v_digits) = 10 THEN
    SELECT array_agg(c.id) INTO v_ids
    FROM public.contractors c
    LEFT JOIN auth.users u ON u.id = c.user_id
    WHERE u.id IS NULL
      AND (
        right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 10) = v_digits
        OR right(regexp_replace(coalesce(c.normalized_phone, ''), '\D', '', 'g'), 10) = v_digits
      );
  END IF;

  IF (v_ids IS NULL OR array_length(v_ids, 1) IS NULL)
     AND coalesce(btrim(p_business_name), '') <> ''
     AND coalesce(btrim(p_city), '') <> '' THEN
    SELECT array_agg(c.id) INTO v_ids
    FROM public.contractors c
    LEFT JOIN auth.users u ON u.id = c.user_id
    WHERE u.id IS NULL
      AND lower(btrim(c.business_name)) = lower(btrim(p_business_name))
      AND lower(btrim(coalesce(c.city, ''))) = lower(btrim(p_city));
  END IF;

  IF v_ids IS NULL OR array_length(v_ids, 1) <> 1 THEN
    RETURN NULL;
  END IF;

  v_id := v_ids[1];

  UPDATE public.contractors c
  SET user_id = p_user_id,
      onboarding_status = 'in_progress',
      updated_at = now()
  WHERE c.id = v_id
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.adopt_orphan_contractor_for_claim(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adopt_orphan_contractor_for_claim(uuid, text, text, text) TO service_role;