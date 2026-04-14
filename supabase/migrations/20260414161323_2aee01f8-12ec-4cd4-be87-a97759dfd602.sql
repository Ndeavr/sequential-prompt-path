
-- Add completion tracking to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_profile_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_completion_score integer NOT NULL DEFAULT 0;

-- Profile completion logs
CREATE TABLE public.profile_completion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  field_updated text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_completion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completion logs"
  ON public.profile_completion_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completion logs"
  ON public.profile_completion_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_profile_completion_logs_user ON public.profile_completion_logs (user_id);

-- RPC: get_profile_completeness
CREATE OR REPLACE FUNCTION public.get_profile_completeness(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  score integer := 0;
  total integer := 6;
  filled integer := 0;
  result jsonb;
BEGIN
  SELECT first_name, last_name, phone, email, address_line_1, city, postal_code
    INTO rec
    FROM profiles
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_name', false, 'has_phone', false, 'has_email', false,
      'has_address', false, 'has_city', false, 'has_postal_code', false,
      'completion_score', 0, 'is_complete', false,
      'missing_fields', '["first_name","phone","email","address_line_1","city","postal_code"]'::jsonb
    );
  END IF;

  IF coalesce(trim(rec.first_name), '') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(trim(rec.phone), '') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(trim(rec.email), '') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(trim(rec.address_line_1), '') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(trim(rec.city), '') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(trim(rec.postal_code), '') <> '' THEN filled := filled + 1; END IF;

  score := round((filled::numeric / total) * 100);

  result := jsonb_build_object(
    'has_name', coalesce(trim(rec.first_name), '') <> '',
    'has_phone', coalesce(trim(rec.phone), '') <> '',
    'has_email', coalesce(trim(rec.email), '') <> '',
    'has_address', coalesce(trim(rec.address_line_1), '') <> '',
    'has_city', coalesce(trim(rec.city), '') <> '',
    'has_postal_code', coalesce(trim(rec.postal_code), '') <> '',
    'completion_score', score,
    'is_complete', (score = 100),
    'missing_fields', (
      SELECT coalesce(jsonb_agg(f), '[]'::jsonb) FROM (
        SELECT unnest(ARRAY[
          CASE WHEN coalesce(trim(rec.first_name), '') = '' THEN 'first_name' END,
          CASE WHEN coalesce(trim(rec.phone), '') = '' THEN 'phone' END,
          CASE WHEN coalesce(trim(rec.email), '') = '' THEN 'email' END,
          CASE WHEN coalesce(trim(rec.address_line_1), '') = '' THEN 'address_line_1' END,
          CASE WHEN coalesce(trim(rec.city), '') = '' THEN 'city' END,
          CASE WHEN coalesce(trim(rec.postal_code), '') = '' THEN 'postal_code' END
        ]) AS f
      ) sub WHERE f IS NOT NULL
    )
  );

  -- Update cached score
  UPDATE profiles
     SET profile_completion_score = score,
         is_profile_complete = (score = 100)
   WHERE user_id = p_user_id;

  RETURN result;
END;
$$;

-- RPC: update_profile_field_partial
CREATE OR REPLACE FUNCTION public.update_profile_field_partial(
  p_field text,
  p_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_fields text[] := ARRAY['first_name','last_name','phone','email','address_line_1','city','postal_code'];
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (p_field = ANY(allowed_fields)) THEN
    RAISE EXCEPTION 'Field not allowed: %', p_field;
  END IF;

  EXECUTE format('UPDATE profiles SET %I = $1, updated_at = now() WHERE user_id = $2', p_field)
    USING p_value, uid;

  -- Log the update
  INSERT INTO profile_completion_logs (user_id, field_updated, source)
    VALUES (uid, p_field, 'alex');

  -- Recalculate and return fresh completeness
  RETURN get_profile_completeness(uid);
END;
$$;
