ALTER TABLE public.sms_events_v2 DROP CONSTRAINT IF EXISTS sms_events_v2_status_check;

ALTER TABLE public.sms_events_v2
  ADD CONSTRAINT sms_events_v2_status_check
  CHECK (status = ANY (ARRAY[
    'queued','accepted','scheduled','sending','sent',
    'delivered','undelivered','failed','canceled',
    'receiving','received','read',
    'api_accepted','invalid_phone','blocked','opted_out',
    'retry_scheduled','contact_required','deferred_window','delivery_unknown'
  ]));

CREATE OR REPLACE FUNCTION public.normalize_sms_event_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS NULL THEN
    NEW.status := 'delivery_unknown';
  ELSE
    NEW.status := lower(trim(NEW.status));
    IF NEW.status = 'cancelled' THEN NEW.status := 'canceled'; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_sms_event_status ON public.sms_events_v2;
CREATE TRIGGER trg_normalize_sms_event_status
  BEFORE INSERT OR UPDATE ON public.sms_events_v2
  FOR EACH ROW EXECUTE FUNCTION public.normalize_sms_event_status();