ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS rbq_declaration text,
  ADD COLUMN IF NOT EXISTS rbq_declaration_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rbq_declared_at timestamptz;

ALTER TABLE public.contractors DROP CONSTRAINT IF EXISTS contractors_rbq_declaration_chk;
ALTER TABLE public.contractors ADD CONSTRAINT contractors_rbq_declaration_chk
  CHECK (rbq_declaration IS NULL OR rbq_declaration IN ('has_license','not_required','in_progress','unsure','other'));

COMMENT ON COLUMN public.contractors.rbq_declaration IS 'Self-declared RBQ situation (DECLARED). Never grants verification or regulated-work eligibility; only rbq_compliance_status=verified set by admin/service does.';

CREATE OR REPLACE FUNCTION public.protect_contractor_rbq_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Clients can never self-verify nor clear an expired/invalid verdict.
  IF TG_OP = 'INSERT' THEN
    IF NEW.rbq_compliance_status IN ('verified','expired') THEN
      NEW.rbq_compliance_status := 'in_progress';
    END IF;
    NEW.rbq_verified_at := NULL;
    NEW.rbq_last_check := NULL;
    RETURN NEW;
  END IF;
  NEW.rbq_verified_at := OLD.rbq_verified_at;
  NEW.rbq_last_check := OLD.rbq_last_check;
  IF OLD.rbq_compliance_status IN ('verified','expired') THEN
    IF OLD.rbq_compliance_status = 'verified'
       AND coalesce(NEW.rbq_number,'') IS DISTINCT FROM coalesce(OLD.rbq_number,'') THEN
      -- New number = new verification required.
      NEW.rbq_compliance_status := 'in_progress';
      NEW.rbq_verified_at := NULL;
    ELSE
      NEW.rbq_compliance_status := OLD.rbq_compliance_status;
      NEW.rbq_expiry_date := OLD.rbq_expiry_date;
    END IF;
  ELSIF NEW.rbq_compliance_status IN ('verified','expired') THEN
    NEW.rbq_compliance_status := OLD.rbq_compliance_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_contractor_rbq_fields ON public.contractors;
CREATE TRIGGER trg_protect_contractor_rbq_fields
  BEFORE INSERT OR UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION public.protect_contractor_rbq_fields();