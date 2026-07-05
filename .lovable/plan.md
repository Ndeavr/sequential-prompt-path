# Email Health Truth Layer v2.0

## Goal
Replace the current `/admin/email-health` (which shows contradictory "Conforme" + HTTP 400) with a dashboard where every indicator comes from **live verification**, never stale logs. Admin answers in <5s: can UNPRO send email right now, and what revenue is at risk.

## Architecture

```text
Browser  →  /admin/email-health (v2)
              │
              ├── useEmailHealthV2  → edge: email-health-v2  (live checks, no cache)
              ├── useEmailLiveTest  → edge: email-live-test  (real Resend send)
              ├── useEmailEvents    → email_delivery_events (last 50)
              └── useRevenueImpact  → email_failure_analysis view
                                       │
Cron every 15 min → edge: email-health-selfheal → writes email_health_checks
```

## Database (new migration)
- `email_health_checks` — id, ts, overall_status (healthy|degraded|failed), resend_auth_ok, domain_ok, sender_ok, live_send_ok, latency_ms, error_category, details_json. GRANTs + RLS admin-only.
- `email_delivery_events` — id, ts, recipient, template, status, provider_message_id, latency_ms, error_raw, category. Fed by send functions + Resend webhook.
- `email_failure_analysis` — view aggregating last 24h by `error_category` with counts + estimated lost revenue (pending_onboarding × 0.15 × plan_avg_349).

## Edge Functions
1. **`email-health-v2`** (GET) — runs live in-order:
   - Resend `GET /domains` with current key → auth + fingerprint (last 4).
   - Domain lookup `mail.unpro.ca` → SPF/DKIM/DMARC record status from Resend response.
   - Sender validation: verify `alex@mail.unpro.ca` matches verified domain.
   - Latest `email_health_checks` row for last live-send timestamp.
   - Returns unified `{ status, reason, impact, config, domain, sender, lastLiveSend, categories }`. No fallback to historical success.
2. **`email-live-test`** (POST `{recipient}`) — actually sends via Resend, subject "UNPRO Live Email Health Check", body carries `timestamp/env/deploy_id`. Persists to `email_health_checks` + `email_delivery_events`. Returns raw Resend response (200 or error body).
3. **`email-health-selfheal`** (cron `*/15 * * * *`) — runs all 5 checks incl. live send to `healthcheck@unpro.ca`. Writes row, classifies error into: INVALID_API_KEY | INVALID_SENDER | DOMAIN_NOT_VERIFIED | RATE_LIMITED | RESEND_OUTAGE | TEMPLATE_ERROR | EDGE_FUNCTION_ERROR | UNKNOWN.
4. Patch existing `send-transactional-email` + `auth-email-hook` to append `email_delivery_events` on every send with provider response.

## Frontend — `src/pages/admin/email-health/PageEmailHealthCenterV2.tsx`
Replace body of existing route with new sections (mobile-first, dark admin theme):

1. **HeroRevenueCriticalStatus** — HEALTHY/DEGRADED/FAILED badge + one-line reason + impact sentence. Colored ring. Auto-refresh 30s.
2. **CardConfigurationTruth** — API key loaded y/n, fingerprint `re_xxxx…abcd`, sender, from, reply-to, env, last deploy ts.
3. **CardDomainHealthV2** — `mail.unpro.ca` verified state + SPF/DKIM/DMARC each PASS/WARN/FAIL with raw failing record on expand.
4. **PanelLiveResendTest** — recipient input (defaults to admin email), "Send Live Test" button, shows success + message id + latency, or raw Resend error body.
5. **TableRecentEmailEvents** — last 50 with filter chips (success/bounce/failed/blocked) + search.
6. **CardRootCauseDetector** — counts per category over 24h, click filters events table.
7. **CardRevenueImpact** — pending onboarding × 0.15 × $349, failed onboarding email count, computed loss.
8. **PanelSelfHealingHistory** — last 20 selfheal runs sparkline.
9. Admin action row: Run Health Check · Send Test · Export Failures (CSV) · View Raw Resend · View Runtime Config drawer.

## False-status prevention
- "Sender actif" chip only rendered when `resend_auth_ok && domain_ok && sender_ok && live_send_ok_within_30min`. Otherwise show truthful state.
- Remove all UI paths that derive status from `last_success_at` alone in `HeroSectionEmailHealthStatus`, `useEmailSenderHealth`. Keep hook but re-map to v2 payload.

## Files to change
- Add: migration, 3 edge functions, `useEmailHealthV2.ts`, `useEmailLiveTest.ts`, `useEmailEvents.ts`, `PageEmailHealthCenterV2.tsx`, 9 components under `src/components/email-health-v2/`.
- Edit: `src/app/router.tsx` (point `/admin/email-health` to v2), `send-transactional-email/index.ts` + `auth-email-hook/index.ts` (log events), `supabase/config.toml` (cron).
- Deprecate (keep files, unroute): current `PageEmailHealthCenter.tsx`.

## Out of scope
- Contractor onboarding UI, Alex flows, SMS. Auth email template edits.

## Success
Admin loads page; if Resend returns HTTP 400 the hero is FAILED with "INVALID_API_KEY — onboarding blocked" and revenue impact card shows $ at risk. No green anywhere unless a live send just succeeded.
