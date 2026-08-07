-- 1) CRM tables were created without Data API grants → every client read/write failed.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_prospect_notes TO authenticated;
GRANT ALL ON public.crm_prospect_notes TO service_role;
GRANT SELECT, INSERT ON public.crm_action_log TO authenticated;
GRANT ALL ON public.crm_action_log TO service_role;

-- 2) Monotonic lifecycle guard: Twilio delivery state must never overwrite a
--    terminal business/payment state on verified_contractor_prospects.
CREATE OR REPLACE FUNCTION public.enforce_monotonic_outreach_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rank_old int;
  rank_new int;
BEGIN
  IF NEW.outreach_status IS NOT DISTINCT FROM OLD.outreach_status THEN
    RETURN NEW;
  END IF;

  rank_old := CASE lower(coalesce(OLD.outreach_status, 'none'))
    WHEN 'none' THEN 0 WHEN 'queued' THEN 1 WHEN 'failed' THEN 2
    WHEN 'sent' THEN 3 WHEN 'delivered' THEN 4 WHEN 'clicked' THEN 5
    WHEN 'registered' THEN 6 WHEN 'payment_started' THEN 7
    WHEN 'paid' THEN 8 WHEN 'activated' THEN 9 ELSE 3 END;

  rank_new := CASE lower(coalesce(NEW.outreach_status, 'none'))
    WHEN 'none' THEN 0 WHEN 'queued' THEN 1 WHEN 'failed' THEN 2
    WHEN 'sent' THEN 3 WHEN 'delivered' THEN 4 WHEN 'clicked' THEN 5
    WHEN 'registered' THEN 6 WHEN 'payment_started' THEN 7
    WHEN 'paid' THEN 8 WHEN 'activated' THEN 9 ELSE 3 END;

  -- Terminal business states are immutable except by explicit escalation.
  IF rank_old >= 7 AND rank_new < rank_old THEN
    NEW.outreach_status := OLD.outreach_status;
    RETURN NEW;
  END IF;

  -- Delivery-level downgrades (delivered -> sent, clicked -> delivered) blocked.
  IF rank_new < rank_old THEN
    NEW.outreach_status := OLD.outreach_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monotonic_outreach_status ON public.verified_contractor_prospects;
CREATE TRIGGER trg_monotonic_outreach_status
BEFORE UPDATE ON public.verified_contractor_prospects
FOR EACH ROW EXECUTE FUNCTION public.enforce_monotonic_outreach_status();