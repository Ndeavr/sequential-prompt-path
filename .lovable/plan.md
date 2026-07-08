## Outreach Failure Command Center

Goal: expose exactly why every SMS/email attempt fails so we can fix delivery and get the first paid activation.

### 1. Data layer

**Extend `outreach_delivery_logs`** (already exists — add missing fields):
- `queue_id uuid` → FK `contractor_outreach_queue(id) ON DELETE SET NULL`
- `raw_response jsonb` (full Twilio/Resend body)
- `is_test boolean default false`
- `retryable boolean` (nullable — computed at insert time)
- Index on `(queue_id, created_at desc)` and partial index on `status='failed'`

**New table `first_dollar_milestones`** (single-row-per-event ledger):
- `event text` (`first_delivery`, `first_click`, `first_activation`, `first_payment`)
- `achieved_at timestamptz`, `queue_id`, `contractor_id`, `metadata jsonb`
- Unique on `event`

**Add to `contractor_outreach_queue`**: `is_test boolean default false` (flag E2E rows).

### 2. Instrument `solicitation-send-sms`

Rewrite the send loop so **every attempt** inserts an `outreach_delivery_logs` row:
- Success → `status='sent'`, `provider_message_id`, `raw_response` = full Twilio JSON
- Failure → parse Twilio error body (`{code, message, more_info}`) into `error_code` / `error_message`, store full body in `raw_response`, set `retryable` per rules below
- Network/throw → `error_code='network'`, `retryable=true`
- Mirror `is_test` from the queue row
- Flip `first_delivery` milestone on first `sent`

**Retry classification** (shared helper `_shared/outreachRetryPolicy.ts`):
- Retryable: HTTP 408/429/500/502/503/504, Twilio codes `20429`, `30001`, `30002`, `30003` (queue overflow, unknown, unreachable), network errors, timeouts
- Non-retryable: `21211` invalid number, `21610` opt-out, `21614` landline, `21408` region not enabled, `20003` auth, `21606` from-number invalid

### 3. Edge functions

- **`outreach-retry-failed`** — accepts `{ ids?: uuid[], all_retryable?: true }`. Loads failed queue rows whose latest log is `retryable=true`, resets `status='queued'`, `attempts+1`, then calls `solicitation-send-sms`. Never retries non-retryable codes.
- **`outreach-diagnose-failure`** — accepts `{ log_id }`. Returns `{ prospect, phone, provider, code, message, recommended_action }` using a lookup table of known Twilio/Resend codes.

### 4. Admin UI

**New page `/admin/outreach-errors`** (`src/pages/admin/PageAdminOutreachErrors.tsx`):
- Filter bar: status (all/failed/sent/delivered), channel, provider, date range, "Show test data" toggle (default OFF, filters `is_test=true`)
- Table columns: Company · City · Category · Phone Original · Phone Normalized · Provider · Status · Error Code · Error Message · Retryable (badge) · Timestamp · Actions
- Row click → drawer with raw Twilio/Resend JSON, message body, attempts history
- Bulk action: **Retry Failed Messages** (retryable only)
- Row action: **Analyze Failure** → calls `outreach-diagnose-failure`, shows recommended action inline

**Add to `/admin/solicitation` (existing `AdminSolicitationPage`)**:
- **Production Health Banner** at top: SCRAPED · VALID MOBILES · QUEUED · SENT · DELIVERED · CLICKED · ACTIVATED · PAID · REVENUE. Red when delivered/activated/paid = 0.
- **First Dollar Status banner**: Delivery / Click / Activation / Payment checkmarks, freezes to "FIRST DOLLAR ACHIEVED @ timestamp" once payment fires.
- Replace bare `failed` chip in campaign list with `failed · {code} {short_message}` pulled from latest log.
- "Show Test Data" toggle wired to `is_test`.

### 5. Route + nav

- Add `/admin/outreach-errors` to `src/app/router.tsx` and the admin tools registry.

### 6. Success test

Load `/admin/outreach-errors` → see every failure with Twilio code, message, raw JSON, retryable flag → click Retry on a `429` → status flips to `queued` → send worker picks it up → new log row appears → banner counters increment. First real delivery flips the First Dollar banner from ❌ to ✅.

### Technical notes

- No changes to homeowner surfaces, SEO, landing pages, or onboarding UX.
- `raw_response` is admin-only via existing RLS (`Admins read delivery logs`).
- Retry policy lives in one shared file so both the send function and the UI badge agree.
- Test rows (`is_test=true`) are excluded from all counters and revenue math unless the toggle is on.
