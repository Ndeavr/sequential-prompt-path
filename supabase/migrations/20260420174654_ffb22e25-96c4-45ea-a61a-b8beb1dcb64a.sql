
CREATE OR REPLACE FUNCTION public.war_prospects_assign_slug_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.unpro_slugify(NEW.company_name || '-' || COALESCE(NEW.city, 'qc'))
                || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;
  IF NEW.tracking_token IS NULL OR NEW.tracking_token = '' THEN
    NEW.tracking_token := replace(replace(replace(
      encode((gen_random_uuid()::text || gen_random_uuid()::text)::bytea, 'base64'),
      '+', '-'), '/', '_'), '=', '');
    NEW.tracking_token := substr(NEW.tracking_token, 1, 28);
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.war_prospects
SET tracking_token = substr(replace(replace(replace(
      encode((gen_random_uuid()::text || gen_random_uuid()::text)::bytea, 'base64'),
      '+', '-'), '/', '_'), '=', ''), 1, 28)
WHERE tracking_token IS NULL;
