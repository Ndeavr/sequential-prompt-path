## Twilio E2E Audit — Trace Every Step

Build a single deterministic audit that walks the entire SMS pipeline, reports PASS/FAIL + payloads for each of the 10 stages, then sends a real SMS and waits for the Twilio status callback to flip the row to `delivered`.

### Current findings (already verified during exploration)

- `sms_events_v2` row from the last test (`d2062525…`, 2026-06-27 18:51) **did** return an `event_id` with `status=failed`, `error_code=20003` (auth error — fixed since then by the user's secret update).
- The frontend error "Aucun event_id retourné" (PageSmsHealth.tsx:87) only fires when `sendSms()` returns `event_id: ""`, which happens only when the up-front audit INSERT into `sms_events_v2` fails (`qErr` branch in `_shared/twilioSend.ts`).
- `sms_events_v2` RLS + grants: `service_role` ALL policy exists, `has_table_privilege('service_role', 'public.sms_events_v2', 'INSERT')` = true. So the insert path is healthy at the DB layer.
- Last `sms-admin-test` deploy logs show only boot lines (no recent invocation) — the user's "Aucun event_id" report may predate the secret fix, OR an unrelated path (TwilioDiagnosticPanel smoke test) is being hit. Both will be covered.

### What gets built

#### 1. New edge function `twilio-e2e-audit` (`verify_jwt = false`, admin-gated like `twilio-auth-audit`)

One callable function. Returns a 10-step trace array `[{ step, name, status: pass|fail|warn, latency_ms, request, response, error }]` plus a root-cause verdict.

Steps it runs in order, each isolated and continuing past failure:

| # | Step | What it does |
|---|------|--------------|
| 1 | `frontend_invoke` | Echoes the request body received (proves frontend → edge reachability) |
| 2 | `admin_auth` | Validates caller is admin via `user_roles` |
| 3 | `secrets_present` | Checks `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `SUPABASE_SERVICE_ROLE_KEY` |
| 4 | `db_write_permission` | Inserts a dry-run row into `sms_events_v2` (`status='audit_probe'`), returns the new `event_id`, then deletes it. Confirms grants + RLS for service_role. |
| 5 | `twilio_auth` | `GET /Accounts/{SID}.json` — returns HTTP status + Twilio error code |
| 6 | `from_number_owned` | `GET /IncomingPhoneNumbers.json?PhoneNumber=+14503286776` — confirms canonical sender is in account |
| 7 | `status_callback_reachable` | `HEAD` on `${SUPABASE_URL}/functions/v1/twilio-status` — confirms webhook URL responds |
| 8 | `real_send` | Calls canonical `sendSms()` to `ADMIN_TEST_PHONE` (or `body.to`). Captures `event_id`, `twilio_sid`, request form, full Twilio response JSON. |
| 9 | `poll_callback` | Polls `sms_events_v2` row by `event_id` every 2 s for up to 60 s. PASS when `status ∈ {sent, delivered}`, FAIL on `failed/undelivered/blocked`, WARN on timeout. |
| 10 | `dashboard_reads` | Re-queries the exact aggregates `PageSmsHealth.tsx` uses (`status` rollup for last 24 h) and confirms the new event_id is in the count. |

Each step returns:

```ts
{ step: number, name: string, status: 'pass'|'fail'|'warn',
  latency_ms: number, http_status?: number, twilio_code?: string,
  request?: unknown, response?: unknown, error?: string }
```

Root-cause verdict logic — first failing step wins; map to one of:
`FRONTEND_UNREACHABLE | NOT_ADMIN | SECRET_MISSING:{name} | DB_INSERT_BLOCKED | TWILIO_AUTH_FAILED | FROM_NUMBER_NOT_IN_ACCOUNT | STATUS_CALLBACK_UNREACHABLE | TWILIO_SEND_REJECTED:{code} | CALLBACK_NEVER_FIRED | DASHBOARD_QUERY_MISMATCH | HEALTHY`.

#### 2. Admin UI: `TwilioE2EAuditPanel`

Added under existing `TwilioDiagnosticPanel` in `/admin/revenue-intelligence`. Single "Run Full E2E (10)" button. Renders one row per step with badge (✓ / ✗ / ⏳), latency, copy-paste payload toggle, and a final amber/green verdict bar with the exact failing secret/step + one-click repair CTA (e.g. open `update_secret` for the named secret).

### Fix the immediate "Aucun event_id retourné" bug

In `src/pages/admin/PageSmsHealth.tsx` (line 87): when `data.event_id` is empty but `data.error` exists, surface `data.error` instead of the generic message. Also display `data.error_code` and `data.error_message` from `sendSms()` so failures (e.g. WRONG_SENDER, OUT_OF_WINDOW, audit_insert_failed) are not hidden behind one ambiguous string.

### Files

- `supabase/functions/twilio-e2e-audit/index.ts` (new)
- `supabase/config.toml` — register `[functions.twilio-e2e-audit] verify_jwt = false`
- `src/components/admin/TwilioE2EAuditPanel.tsx` (new)
- `src/components/admin/TwilioDiagnosticPanel.tsx` — mount the new panel
- `src/pages/admin/PageSmsHealth.tsx` — surface real error from `sms-admin-test`

### Done when

- Clicking "Run Full E2E (10)" returns 10 step rows with PASS/FAIL + payloads.
- A successful run produces a real SMS to `ADMIN_TEST_PHONE`, the `sms_events_v2` row flips to `delivered` via the Twilio callback (step 9 PASS), and the `PageSmsHealth` aggregates count it (step 10 PASS).
- A failing run names the exact failing step, exact failing secret/URL, and the precise Twilio code or DB error in the verdict bar.
