
-- Function: get service limit per plan (primary + secondary)
CREATE OR REPLACE FUNCTION public.get_service_limit(plan_code text, service_type text DEFAULT 'secondary')
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN service_type = 'primary' THEN
      CASE
        WHEN plan_code = 'signature' THEN 8
        WHEN plan_code = 'elite' THEN 6
        WHEN plan_code = 'premium' THEN 4
        WHEN plan_code = 'pro' THEN 3
        WHEN plan_code = 'recrue' THEN 2
        ELSE 2
      END
    ELSE -- secondary
      CASE
        WHEN plan_code = 'signature' THEN 20
        WHEN plan_code = 'elite' THEN 15
        WHEN plan_code = 'premium' THEN 10
        WHEN plan_code = 'pro' THEN 5
        WHEN plan_code = 'recrue' THEN 2
        ELSE 2
      END
  END;
$$;
