CREATE OR REPLACE FUNCTION public.canonical_plan_code(_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE lower(coalesce(_code, ''))
    -- legacy / superseded contractor slugs -> currently ACTIVE catalog codes
    WHEN 'recrue'      THEN 'presence'
    WHEN 'local'       THEN 'depart'
    WHEN 'croissance'  THEN 'croissance_v2'
    WHEN 'pro'         THEN 'pro_v2'
    WHEN 'premium'     THEN 'elite_v2'
    WHEN 'elite'       THEN 'elite_v2'
    WHEN 'élite'       THEN 'elite_v2'
    WHEN 'domination'  THEN 'signature_v2'
    WHEN 'signature'   THEN 'signature_v2'
    ELSE lower(coalesce(_code, ''))
  END
$function$;