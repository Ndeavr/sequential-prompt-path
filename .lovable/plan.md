
# Health Engine Repair — `/admin/outreach-health`

Make the cockpit tell the truth, fix Resend, and survive mobile.

## 1. Resend — kill the HTTP 400

Edit `supabase/functions/outreach-health-agent/index.ts` → `probeResend()`:

- Call `GET https://api.resend.com/domains`, but on non-OK **read the JSON body** (`{ name, message, statusCode }`) and surface `message` in `failure_reason`/`message` columns. Resend returns 400 for malformed/restricted keys with a clear `message` — currently we throw it away.
- Add a second probe: `GET https://api.resend.com/api-keys` (auth ping) — if it returns 200, the key works; if 401/403, mark `RESEND_AUTH_ERROR` with body.
- Cache verified sender domain in DB (`outreach_health_state.resend_verified_domain`) — populated by reading `/domains` and picking the first `status === "verified"` entry. If none, status `red` with reason `NO_VERIFIED_DOMAIN`, repair_action `manual_required`.

New edge function `supabase/functions/outreach-resend-send/index.ts` (real send used by repair + E2E step 3):

- Inputs: `to`, `subject`, `html`, `text`, `cta_url` (required), `tags`.
- Reject (HTTP 422 + log `email_failed` reason `MISSING_CTA`) if `cta_url` empty or `html` lacks `href="…"`.
- Reject if `to` invalid email or `subject` empty.
- Build `from` = `UNPRO <noreply@${resend_verified_domain}>` from DB; if no verified domain, fall back to `onboarding@resend.dev` and only allow sending to `founder@unpro.ca` / `to === founder`.
- Always include `text` (derive from html if missing).
- Call Resend; if non-2xx, parse body, write a `email_send_log` row with `status='email_failed'`, `error_message=<resend body.message>`, `metadata={statusCode, name}`, and return the same payload to the caller (no silent success).
- On success: log `status='sent'`, return `id`.

## 2. E2E — explain every failure

Rewrite `supabase/functions/acq-e2e-real/index.ts` so each of the 14 steps does real work (no `mode: "probe"` rubber-stamping):

```text
 1 create_synthetic_contractor      insert tagged __e2e_ row
 2 enrich_contact                   call detect mobile/email helper
 3 generate_tracked_cta             insert acquisition_tracking_links row → /r/{id}
 4 generate_outreach                render template via masterOutreachCopy
 5 send_email                       call outreach-resend-send to founder inbox
 6 verify_email_delivered           poll email_send_log for status='sent' (5s)
 7 send_sms                         twilio test to MAGIC_NUMBER (+15005550006)
 8 verify_sms_delivered             poll outreach_sms_events 5s
 9 click_tracked_cta                fetch /r/{id} expect 302
10 verify_click_event               check acquisition_events 'clicked'
11 load_landing_page                fetch unpro.ca/r target landing, expect 200
12 stripe_test_checkout             create test-mode checkout session (no charge)
13 verify_funnel_increment          read v_outreach_funnel for our run_group
14 cleanup                          delete all rows tagged with run_group
```

Each step writes one row into `outreach_e2e_full_runs` with `step_index`, `step`, `step_status`, `error`, `repair_hint`. On the first `fail`, mark remaining steps `skipped` and stop. Response payload:

```json
{
  "pass": false,
  "failed_step": { "index": 5, "step": "send_email",
                   "error": "RESEND_PROVIDER_ERROR: ...",
                   "repair": "Verify sender domain in Resend" },
  "total_ms": 2580
}
```

Update `useRunE2EReal` toast + `PageAdminOutreachHealth` "Tests E2E 14 étapes" list to render `failed_step` (number, name, error, repair action). Add an expandable row showing all 14 step rows from `outreach_e2e_full_runs` for the run.

## 3. Repair messaging button

- New edge function `supabase/functions/outreach-repair-messaging/index.ts` running a focused sequence:
  1. Resend `/api-keys` ping → if fail, return `repair=rotate_RESEND_API_KEY`.
  2. Resend `/domains` → ensure ≥1 verified domain, cache it.
  3. Send live test email to `founder@unpro.ca` via `outreach-resend-send`.
  4. Validate CTA generator (insert + read tracking link).
  5. `GET /r/{id}` redirect.
  Persist a `outreach_repair_runs` row per sub-step. On finish, invoke `outreach-health-agent` then `acq-e2e-real`.
- UI: add an amber **"Réparer la messagerie"** button next to "Run health agent" (visible whenever `messaging<100`).

## 4. Honest scoring

Edit `computeScore()` in `outreach-health-agent`:

```text
messaging  = max 60 if any resend probe != green
autopilot  = max 70 if messaging < 95 OR no PASS E2E in 24h
overall    = max 70 if latest acq-e2e-real PASS is missing or older than 24h
overall    = min(overall, all subscores)   // never higher than weakest pillar
```

Read latest E2E status from `outreach_e2e_full_runs` (summary row, last 24h) before computing. UI keeps the same component — only the numbers change. Add `score.reason_capped: string[]` so the cockpit shows why a score is capped (small caption under each ring).

## 5. Mobile layout fix — `PageAdminOutreachHealth.tsx`

Replace the Active Health Engine header (`<CardHeader className="flex flex-row items-center justify-between">`) with a responsive stack:

```text
className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
```

- Title block: add `min-w-0`, drop forced narrow column. Description gets `text-sm whitespace-normal break-normal`.
- Buttons: wrap in `flex flex-col sm:flex-row gap-2 w-full sm:w-auto`, each `Button` gets `w-full sm:w-auto justify-center`. Shorten label to `Run E2E (14)` on `<sm`.
- Score grid: `grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2` (already close — verify).
- Page wrapper: add `overflow-x-hidden` to outer container and `min-w-0` to all Card children that contain tables; wrap the funnel + emails tables in `overflow-x-auto -mx-4 sm:mx-0`.
- Provider status grid keeps single column on mobile (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`).

## 6. Files touched

```text
supabase/functions/outreach-health-agent/index.ts           edit  (probeResend, score caps)
supabase/functions/outreach-resend-send/index.ts            new   (validated send + log)
supabase/functions/outreach-repair-messaging/index.ts       new   (repair sequence)
supabase/functions/acq-e2e-real/index.ts                    rewrite (real 14 steps)
supabase/migrations/<ts>_outreach_health_state.sql          new   (state table for verified domain)
src/hooks/useOutreachHealth.ts                              edit  (add useRepairMessaging, failed_step types)
src/pages/admin/PageAdminOutreachHealth.tsx                 edit  (mobile layout + repair button + failed-step UI)
```

## 7. Success criteria

- Resend card no longer shows generic HTTP 400 — either green or shows Resend's actual error message + repair hint.
- E2E run lists failed step number, name, error, repair action.
- "Réparer la messagerie" button visible; rerun fires E2E automatically.
- Overall ≤ 70 whenever latest E2E < PASS; Messaging ≤ 60 when Resend not green; Autopilot ≤ 70 when messaging undelivered.
- Mobile (≤384px): header title on one line block, buttons full-width stacked, no horizontal overflow, "Run real E2E (14)" fully visible.
