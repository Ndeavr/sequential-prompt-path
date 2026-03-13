
-- Function: get city limit per plan
CREATE OR REPLACE FUNCTION public.get_city_limit(plan_code text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN plan_code = 'signature' THEN 50
    WHEN plan_code = 'elite' THEN 25
    WHEN plan_code = 'premium' THEN 15
    WHEN plan_code = 'pro' THEN 8
    WHEN plan_code = 'recrue' THEN 3
    ELSE 3
  END;
$$;
