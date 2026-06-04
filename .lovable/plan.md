## Root cause (confirmed)

`agent-send-outreach` calls `send-sms-prospect` with the wrong body:

```ts
body: JSON.stringify({ to: lead.phone, body: m.body, lead_id: lead.id })
```

But `send-sms-prospect` expects `{ prospect_id, phone, first_name, company_name, template }` and validates phone strictly against `^\+1\d{10}$`. Result: every call returns 400 → all 17 messages marked `failed`, 0 sent. Quotas are also consumed BEFORE the attempt, so failures burn quota.

Secondary issues:
- No phone normalization (Quebec numbers stored as `514-555-1234`, `(514) 555 1234`, etc. all fail the regex).
- No fallback to email when SMS fails.
- Errors stored as a vague string (`"sms 400"`) — no Twilio code, no recipient, no provider response.
- Cockpit shows `status: ok` from `recordAgentRun` even when `sent=0, failed>17`.
- No way to test send from Admin, no visible "why nothing was sent" diagnostics.

---

## Changes

### 1. New table `outreach_delivery_logs` (migration)
Columns: `id, lead_id, message_id, channel (sms|email), provider, recipient_raw, recipient_normalized, message_body, status (queued|sent|failed|blocked|skipped), error_code, provider_message_id, error_message, attempt, created_at, sent_at`.
RLS: admin read-only via `has_role`, service_role full. Grants for `authenticated` (admin filter in client) + `service_role`.

### 2. Rewrite `agent-send-outreach/index.ts`
- Add `normalizePhoneQc(raw)` → returns `+1XXXXXXXXXX` or `null` (strip non-digits, prefix `+1` for 10-digit, validate length).
- For each pending `agent_outreach_messages` row:
  1. Load lead (phone, email, contact name, business name).
  2. Decide channel: try SMS if normalized phone valid; else fallback to email if email present; else mark `blocked` reason `no_contact`.
  3. **Check** (don't consume) the channel + trade_city quota. If exceeded → mark `blocked` reason `quota`, log, continue. Quota is only consumed AFTER provider returns success.
  4. Call `send-sms-prospect` with the correct payload `{ prospect_id: lead.id, phone: normalized, first_name, company_name, template: 'intro' }` — OR send email via `send-transactional-email` (Resend) when SMS not possible/failed.
  5. Capture full provider response (status, Twilio `code`, `sid`, `message`). Insert into `outreach_delivery_logs` with all fields.
  6. On 4xx provider error and email available → automatically retry on email channel (one fallback per message).
  7. Update `agent_outreach_messages.status` to `sent` / `failed` with detailed `error` JSON `{ code, message, provider, recipient }`.
- Return `{ sent, failed, blocked, queue, by_channel: { sms_sent, email_sent }, errors_breakdown: { missing_secret, invalid_phone, provider_rejected, quota, no_contact, opt_out, cooldown } }`.
- Set `result.ok = sent > 0 || queue === 0`.

### 3. Wrap `recordAgentRun` status
Patch the cockpit so badge uses:
- `ok` only if `sent > 0`
- `warning` if `queue > 0 && sent === 0 && failed === 0` (all blocked)
- `failed` if `failed > 0`

### 4. New edge function `agent-send-test`
Accepts `{ phone, email, channel }` (admin-only via `getClaims` + `has_role`). Calls Twilio/Resend directly and returns the **raw provider response** (status code, body) so the operator sees exactly what Twilio says.

### 5. Cockpit (`PageAutonomousEngine.tsx`) additions
- **"Pourquoi rien n'a été envoyé?"** panel: queries `outreach_delivery_logs` last 24h, aggregates by `status` + `error_code`, shows counts for: `missing_secret`, `invalid_phone`, `provider_rejected`, `quota_exceeded`, `opt_out`, `cooldown`, `no_contact`, `queue_empty`, `simulation_mode`.
- **Secrets health row**: ping a new lightweight RPC / function `check-outreach-secrets` (returns booleans for TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID, RESEND_API_KEY). Red badge if any missing.
- **Test SMS button**: input field for phone, calls `agent-send-test`, displays raw JSON response.
- **Send agent status**: derive ok/warning/failed from `output.sent / failed / queue` instead of generic `status`.
- **Recent deliveries table**: last 20 rows of `outreach_delivery_logs` with channel, recipient, status, error_code, provider_message_id.

### 6. Verification step
After deploy, manually trigger `agent-send-outreach` with `{ limit: 1 }` from cockpit. Expect:
- `sent: 1, failed: 0`
- `outreach_delivery_logs` row with `provider_message_id` (Twilio SID).
- If all leads have bad phones, expect `failed: 0, blocked: 1, reason: invalid_phone` (no quota burn).

---

## Files

**Created**
- `supabase/migrations/<ts>_outreach_delivery_logs.sql`
- `supabase/functions/agent-send-test/index.ts`
- `supabase/functions/check-outreach-secrets/index.ts`

**Edited**
- `supabase/functions/agent-send-outreach/index.ts` (full rewrite)
- `src/pages/admin/PageAutonomousEngine.tsx` (diagnostics panel, secrets row, test button, deliveries table, status derivation)

No changes to scout/enrich/generate/dispatch agents or other unrelated code.
