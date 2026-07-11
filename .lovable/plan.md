## Goal

The Kijiji outreach queue currently writes rows into `contractor_outreach_logs` with `status="queued"` but no code ever picks them up and calls Twilio. Even with `dry_run=false` from the admin UI, no SMS actually leaves the platform. This plan wires the queue directly to the canonical Twilio sender and flips the default to real sending, with the necessary safety rails.

## Changes

### 1. `supabase/functions/queue-kijiji-outreach/index.ts`
- Import `sendSms` from `../_shared/twilioSend.ts`.
- When `dry_run=false` and the prospect is SMS-eligible (P0/P1 → `sms_ready`):
  1. Create the `contractor_leads` row (as today).
  2. Insert the `contractor_outreach_logs` row with `status="sending"` (not `"queued"`) and capture its `id`.
  3. Call `sendSms({ to: p.phone, body: rendered, message_type: "outreach", template_key: template.template_name, lead_id, metadata: { source: "kijiji", prospect_id, variant, bucket } })`.
  4. Update the same log row with `status="sent"|"failed"`, `provider_response: { sid, twilio_status }`, `error_message`, `sent_at=now()`.
  5. Update the lead's `outreach_status` to `sent` / `send_failed`.
- Email-only path (P2/P3) stays as today — logs a `queued` row (email dispatch is out of scope; there is already a separate email pipeline).
- Wrap per-prospect send in try/catch so one failure does not abort the batch. Continue collecting `queued[]` / `skipped[]` / add `failed[]`.
- Report each outcome through `_shared/reliability.ts` (`reportOutcome`) with canonical `FailureCode.TWILIO_*` codes so the failures show up in `/admin/revenue-reality`.

### 2. `supabase/functions/kijiji-daily-orchestrator/index.ts`
- Change the default `dry_run` from `true` to `false` for the P0 queue step, but still accept `body.dry_run` to force a rehearsal.
- Pass through `bucket: "P0"`, `limit: 25` (unchanged).

### 3. `src/pages/admin/PageAdminKijijiSource.tsx`
- Split the P0 action into two explicit buttons:
  - **"Simuler P0 (dry-run)"** → invokes with `dry_run: true` and shows the message previews.
  - **"Envoyer P0 réel"** → invokes with `dry_run: false`; shows a confirm dialog ("Envoi SMS réels via Twilio. Continuer ?") before firing.
- Toast reports `queued`, `sent`, `failed` counts (add a `failed` field to the tuple).
- No other UI changes.

### 4. Safety rails (kept, not weakened)
- Suppression list check — unchanged.
- Daily cap `max_sms_queue_per_day` — unchanged.
- `sms_ready` eligibility (Twilio Lookup mobile confirmed) — unchanged, gates the send.
- `sendSms()` already enforces send window, opt-out, phone validation, and the QC sender number.

## Out of scope
- No change to email delivery.
- No change to Twilio credentials or webhook wiring.
- No new tables.

## Verification
1. From `/admin/acquisition/sources/kijiji`, click **Simuler P0 (dry-run)** → toast shows `queued: N`, no Twilio traffic, all previews rendered.
2. Click **Envoyer P0 réel** → confirm dialog → toast shows `sent: N, failed: F`; new rows in `contractor_outreach_logs` with `status="sent"` and a Twilio `sid`; `/admin/revenue-reality` funnel "SMS sent" increments within 30 s.
3. `sms_events_v2` receives one row per attempt (existing invariant of `sendSms`).