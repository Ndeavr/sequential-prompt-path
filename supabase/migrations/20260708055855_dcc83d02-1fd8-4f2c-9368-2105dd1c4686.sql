
-- 1) Deactivate junk profiles
UPDATE public.contractors
SET account_status = 'inactive', updated_at = now()
WHERE account_status = 'active'
  AND city IS NULL
  AND (specialty IS NULL OR specialty::text IN ('', '{}', 'null'))
  AND is_published = false
  AND id NOT IN (SELECT contractor_id FROM public.contractor_service_areas)
  AND id NOT IN (SELECT contractor_id FROM public.contractor_category_assignments);

-- 2) Auto-enable accepting for fully-ready contractors currently stalled
UPDATE public.contractors c
SET is_accepting_appointments = true, updated_at = now()
WHERE c.account_status = 'active'
  AND c.is_accepting_appointments = false
  AND c.is_published = true
  AND c.is_discoverable = true
  AND c.verification_status IN ('verified', 'pending')
  AND EXISTS (SELECT 1 FROM public.contractor_service_areas sa WHERE sa.contractor_id = c.id)
  AND EXISTS (SELECT 1 FROM public.contractor_category_assignments ca WHERE ca.contractor_id = c.id);

-- 3) Extend readiness trigger: when a contractor becomes fully ready, flip accepting=true
CREATE OR REPLACE FUNCTION public.auto_enable_accepting_when_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_accepting_appointments = false
     AND NEW.account_status = 'active'
     AND NEW.is_published = true
     AND NEW.is_discoverable = true
     AND NEW.verification_status IN ('verified', 'pending')
     AND EXISTS (SELECT 1 FROM public.contractor_service_areas WHERE contractor_id = NEW.id)
     AND EXISTS (SELECT 1 FROM public.contractor_category_assignments WHERE contractor_id = NEW.id)
  THEN
    NEW.is_accepting_appointments := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enable_accepting_when_ready ON public.contractors;
CREATE TRIGGER trg_auto_enable_accepting_when_ready
BEFORE INSERT OR UPDATE OF is_published, is_discoverable, verification_status, account_status
ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.auto_enable_accepting_when_ready();
