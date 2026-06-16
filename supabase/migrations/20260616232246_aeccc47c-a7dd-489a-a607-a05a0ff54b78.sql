
-- 1. Columns
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_type text,
  ADD COLUMN IF NOT EXISTS phone_validation_status text NOT NULL DEFAULT 'pending_validation',
  ADD COLUMN IF NOT EXISTS phone_failure_reason text,
  ADD COLUMN IF NOT EXISTS phone_lookup_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_carrier text,
  ADD COLUMN IF NOT EXISTS phone_area_code text;

-- 2. Validation trigger for status enum
CREATE OR REPLACE FUNCTION public.check_phone_validation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_validation_status IS NOT NULL
     AND NEW.phone_validation_status NOT IN (
       'pending_validation','valid_mobile','valid_voip','landline',
       'invalid_phone','outside_quebec','do_not_contact','lookup_failed'
     ) THEN
    RAISE EXCEPTION 'invalid phone_validation_status: %', NEW.phone_validation_status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_phone_validation_status ON public.contractor_leads;
CREATE TRIGGER trg_check_phone_validation_status
  BEFORE INSERT OR UPDATE OF phone_validation_status ON public.contractor_leads
  FOR EACH ROW EXECUTE FUNCTION public.check_phone_validation_status();

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_leads_phone_validation_status
  ON public.contractor_leads (phone_validation_status);
CREATE INDEX IF NOT EXISTS idx_contractor_leads_phone_e164
  ON public.contractor_leads (phone_e164);

-- 4. Backfill: format-only classification (Twilio Lookup still required for mobile vs landline)
WITH cleaned AS (
  SELECT
    id,
    regexp_replace(COALESCE(mobile_phone, phone, ''), '\D', '', 'g') AS digits
  FROM public.contractor_leads
  WHERE phone_validation_status = 'pending_validation'
),
classified AS (
  SELECT
    id,
    CASE
      WHEN length(digits) = 10 THEN '+1' || digits
      WHEN length(digits) = 11 AND left(digits,1) = '1' THEN '+' || digits
      ELSE NULL
    END AS e164,
    CASE
      WHEN length(digits) = 10 THEN left(digits,3)
      WHEN length(digits) = 11 AND left(digits,1) = '1' THEN substring(digits,2,3)
      ELSE NULL
    END AS npa
  FROM cleaned
)
UPDATE public.contractor_leads cl
SET
  phone_e164 = c.e164,
  phone_area_code = c.npa,
  phone_validation_status = CASE
    WHEN c.e164 IS NULL THEN 'invalid_phone'
    WHEN substring(c.e164 from 3 for 1) !~ '[2-9]' THEN 'invalid_phone'
    WHEN substring(c.e164 from 6 for 1) !~ '[2-9]' THEN 'invalid_phone'
    WHEN c.npa NOT IN ('418','438','450','468','514','579','581','819','873','354','367','263') THEN 'outside_quebec'
    ELSE 'pending_validation'
  END,
  phone_failure_reason = CASE
    WHEN c.e164 IS NULL THEN 'invalid_format'
    WHEN substring(c.e164 from 3 for 1) !~ '[2-9]' OR substring(c.e164 from 6 for 1) !~ '[2-9]' THEN 'invalid_nanp'
    WHEN c.npa NOT IN ('418','438','450','468','514','579','581','819','873','354','367','263') THEN 'outside_quebec'
    ELSE NULL
  END
FROM classified c
WHERE cl.id = c.id;

-- 5. Tighten curiosity enrollment to require valid mobile/voip
CREATE OR REPLACE FUNCTION public.enroll_curiosity_sequence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_token text;
BEGIN
  IF NEW.funnel_type IS DISTINCT FROM 'ai_score_curiosity' THEN
    RETURN NEW;
  END IF;
  IF NEW.pipeline_status IS DISTINCT FROM 'ready_for_outreach' THEN
    RETURN NEW;
  END IF;
  IF (TG_OP = 'UPDATE' AND OLD.pipeline_status = NEW.pipeline_status) THEN
    RETURN NEW;
  END IF;

  -- HARD GATE: only enroll if phone is validated mobile/voip
  IF NEW.phone_validation_status NOT IN ('valid_mobile','valid_voip') THEN
    RETURN NEW;
  END IF;

  IF NEW.curiosity_slug IS NULL OR NEW.curiosity_token IS NULL THEN
    v_slug := lower(substring(encode(gen_random_bytes(8),'hex') from 1 for 12));
    v_token := encode(gen_random_bytes(24),'hex');
    NEW.curiosity_slug := v_slug;
    NEW.curiosity_token := v_token;
  END IF;

  INSERT INTO public.curiosity_sequences (lead_id, current_step, status, next_send_at)
  VALUES (NEW.id, 1, 'active', now())
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;
