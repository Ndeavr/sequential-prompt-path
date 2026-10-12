CREATE OR REPLACE FUNCTION public.casl_evidence_human_review_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  -- Once signed, the reviewer identity is immutable.
  IF OLD.reviewer_id IS NOT NULL AND NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id THEN
    RAISE EXCEPTION 'casl_review_reviewer_immutable';
  END IF;
  IF OLD.reviewer_id IS NULL AND NEW.reviewer_id IS NOT NULL THEN
    -- Only a real signed-in admin can sign, and only as themselves (service role cannot sign).
    IF auth.uid() IS NULL OR NEW.reviewer_id <> auth.uid() OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'casl_review_requires_admin_self';
    END IF;
    IF NEW.is_valid THEN
      IF coalesce(length(btrim(NEW.reviewer_notes)), 0) < 30 THEN
        RAISE EXCEPTION 'casl_review_notes_too_short';
      END IF;
      IF NEW.lawful_basis = 'implicit_public_conspicuous' AND coalesce(NEW.source_type,'') <> 'company_website' THEN
        RAISE EXCEPTION 'casl_review_third_party_source_not_approvable';
      END IF;
      IF coalesce(NEW.refusal_statement_found, false) THEN
        RAISE EXCEPTION 'casl_review_refusal_found';
      END IF;
      IF NEW.source_url IS NULL OR NEW.source_url !~* '^https://' THEN
        RAISE EXCEPTION 'casl_review_source_url_required';
      END IF;
    ELSE
      IF coalesce(length(btrim(NEW.invalidated_reason)), 0) < 30 THEN
        RAISE EXCEPTION 'casl_review_reject_reason_too_short';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_casl_evidence_human_review_guard ON public.casl_consent_evidence;
CREATE TRIGGER trg_casl_evidence_human_review_guard
BEFORE UPDATE ON public.casl_consent_evidence
FOR EACH ROW EXECUTE FUNCTION public.casl_evidence_human_review_guard();