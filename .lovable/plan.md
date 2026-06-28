## Root cause

`sms_events_v2.status` CHECK constraint allows only:
`queued, sending, sent, delivered, undelivered, failed, invalid_phone, blocked, opted_out, retry_scheduled, contact_required, deferred_window, delivery_unknown, api_accepted`

Twilio's lifecycle also emits: **`accepted`**, **`scheduled`**, **`receiving`**, **`received`**, **`read`**, **`canceled`** (and webhook may send uppercased values). The E2E inserts `accepted` (Twilio's first state after API submission) → constraint violation → `DB_INSERT_BLOCKED`.

## Fix

### 1. Migration — widen the CHECK + normalize

```sql
ALTER TABLE public.sms_events_v2 DROP CONSTRAINT sms_events_v2_status_check;

-- Normalize anything inbound to lowercase before validation
ALTER TABLE public.sms_events_v2
  ADD CONSTRAINT sms_events_v2_status_check
  CHECK (status = ANY (ARRAY[
    -- Twilio canonical
    'queued','accepted','scheduled','sending','sent',
    'delivered','undelivered','failed','canceled',
    'receiving','received','read',
    -- UNPRO internal
    'api_accepted','invalid_phone','blocked','opted_out',
    'retry_scheduled','contact_required','deferred_window','delivery_unknown'
  ]));

-- Defensive normalizer trigger: lowercase + map legacy spellings
CREATE OR REPLACE FUNCTION public.normalize_sms_event_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.status := lower(trim(NEW.status));
  IF NEW.status IN ('cancelled') THEN NEW.status := 'canceled'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_sms_event_status ON public.sms_events_v2;
CREATE TRIGGER trg_normalize_sms_event_status
  BEFORE INSERT OR UPDATE ON public.sms_events_v2
  FOR EACH ROW EXECUTE FUNCTION public.normalize_sms_event_status();
```

### 2. Code — single mapper used by every writer

Add `supabase/functions/_shared/smsStatusMap.ts`:
- `mapTwilioStatus(raw)` → returns one of the allowed values, defaulting unknown → `'delivery_unknown'` and logging.

Apply it in every insert/update path:
- `supabase/functions/twilio-status-v2/index.ts` (webhook)
- `supabase/functions/_shared/twilioSend.ts` (initial insert — currently writes `accepted`)
- `supabase/functions/twilio-e2e-audit/index.ts` (steps 04 + 09)
- `supabase/functions/sms-admin-test/index.ts`
- any other insert into `sms_events_v2` (grep first)

### 3. Redeploy + rerun

Deploy: `twilio-status-v2`, `twilio-e2e-audit`, `sms-admin-test`, plus any function importing `_shared/twilioSend.ts`.

Then run `Run Full E2E (10)` and confirm:
- 04 db_write_permission PASS
- 08 real_send PASS
- 09 poll_callback PASS
- 10 dashboard_reads PASS

If any still fails, surface the raw `status` value the audit attempted to insert and extend the mapper — the trigger guarantees no further `DB_INSERT_BLOCKED`.
