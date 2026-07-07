
# Revenue Reality Audit + `/admin/revenue-reality` cockpit

## Live production data (queried just now)

| Signal | 24h | Total |
| --- | ---: | ---: |
| `contractor_prospects` scraped | **1** | 241 |
| Prospects with phone | — | 236 |
| Prospects with email | — | 69 |
| `launch_leads` created | **0** | **0** |
| `launch_pipeline_events` (agent ticks) | 4 410 | — |
| `acq_sms_logs` | **0** | **0** |
| `outreach_sms_events` sent | **0** | 6 |
| `click_events` | 1 | 16 |
| `contractor_activation_events` | **0** | **0** |
| `contractor_checkouts` | 0 | 2 |
| `contractor_subscriptions` | 0 | 1 |
| `acq_subscriptions` / `acq_payment_events` | 0 | 0 |

## Reality answers

1. **Scraping** — NO real intake. 1 new row in 24h. `launch-agent-scout` fired 2 876 times and every call blocked with two errors:
   - `google_places: REQUEST_DENIED: The provided API key is invalid` (1 438 times)
   - `All 106 pool rows rejected (no_phone_no_email=106)` (1 438 times) — the scout is reading a pool that has no contact info even though the main prospects table has 236 phones.
2. **SMS** — NO. Zero SMS sent in 24h across `acq_sms_logs`, `outreach_sms_events`, `contractor_curiosity_sms_events`. No Twilio traffic. Nothing queued.
3. **Clicks** — 1 click in 24h, 16 all-time. Tracking works but there is nothing to click on.
4. **Onboarding** — NO. 0 `contractor_activation_events` today or ever.
5. **Stripe** — historical only: 2 checkouts, 1 subscription total, 0 in 24h. Can't confirm live vs test from data alone.
6. **Exact blocker (single line)**: **Nothing is being sent.** The launch commander is ticking every minute but scout is dead (bad Google key + wrong pool source), so no leads land in `launch_leads`, so no SMS agent runs, so no clicks, no onboarding, no revenue. Stripe integrity is moot until an SMS actually goes out.

## Final output required

- Did scraping occur? **NO** (1 row / 24h, all runs blocked)
- Were SMS sent? **NO** (0 across every SMS table)
- Any clicks? Yes (1 in 24h — from an old link, not from today's activity)
- Any onboarding starts? **NO** (0 events)
- Any Stripe checkout? **NO** in 24h (2 historical total)
- **Reason revenue is still $0**: invalid Google Places API key + scout pool disconnected from `contractor_prospects`, so no leads → no SMS → no funnel.

---

## Fixes to ship

### 1. `/admin/revenue-reality` cockpit (new page)
- Single vertical funnel: **Scraped → Valid mobile → SMS sent → Delivered → Clicked → Onboarding started → Checkout opened → Paid**.
- Each step: number in last 24h, running total, drop-off %, last-event timestamp, RED chip if 0 in 24h.
- Sub-panel "Why is the pipeline stuck?" — reads `launch_pipeline_events` where `success=false` in last 24h, groups by `(agent,event,message)`, shows top 5 blocker strings verbatim (this exposes the Google key error immediately).
- Sub-panel "Last 25 SMS attempts" — pulls from `acq_sms_logs` and `outreach_sms_events` UNION-ed: company, phone, status, provider_sid/twilio_sid, error_code, error_message, sent_at.
- Sub-panel "Stripe reality" — last 25 `contractor_checkouts` + `contractor_subscriptions` with amount and mode.
- Route registered in `src/app/router.tsx` under admin, gated by existing admin guard.
- Read-only. No new tables. Uses direct `supabase` reads.

### 2. Emergency SMS burst edge function `emergency-sms-blast`
- Query `contractor_prospects` where `phone` looks mobile (Twilio Lookup or regex on Canadian mobile prefixes: 438/514/438/579/450/581/418/819/438/873/367 excluding known landline ranges — Lookup preferred).
- Pick 25 prospects not already in `acq_sms_logs`.
- Rotate 5 message variants stored in `outbound_sequence_steps` (or inline constants if unavailable) — each carries a personalized short link `https://unpro.ca/r/<slug>` that logs to `click_events`.
- Force first send to **+15142499522** as a smoke test.
- Skip any number Lookup flags as `landline`.
- Log every attempt to `acq_sms_logs` with `twilio_sid`, `status`, `error_code`, `error_message`, `variant_id`, `sent_at`.
- Admin-only invocation (JWT + role check).
- Fire from a new button "Send 25 emergency SMS" on `/admin/revenue-reality` (dry-run toggle, defaults ON).

### 3. Fix the two scout blockers (root cause)
- **Google Places key**: add `add_secret` prompt to the user for a valid `GOOGLE_PLACES_API_KEY`; the `launch-agent-scout` edge function already reads it — no code change needed once the secret is set.
- **Wrong pool source**: patch `launch-agent-scout` to fall back to `contractor_prospects` (has 236 phones) when the current pool table returns 0 valid rows, and to log rejection reasons per-row into `launch_pipeline_events.payload` for observability.

### 4. Stripe reality check panel
- Read `stripe.customers` via the existing Stripe MCP; render account_mode (live/test) and last 10 payment intents on the cockpit. No code changes to checkout flow in this pass.

## Files to touch

- create `src/pages/admin/PageRevenueReality.tsx`
- create `src/services/revenueRealityService.ts` (all read queries)
- edit `src/app/router.tsx` (register route)
- create `supabase/functions/emergency-sms-blast/index.ts`
- edit `supabase/functions/launch-agent-scout/index.ts` (fallback pool + rejection logging)
- request secret `GOOGLE_PLACES_API_KEY` from user before scout can succeed
- create `docs/tests/revenue-reality-smoke.md`

## Constraints

- No schema changes, no vanity metrics, no design work.
- Every metric on the cockpit is a direct COUNT/SELECT from real tables; no derived caches.
- SMS blast is behind a dry-run switch and admin-only.
- Twilio credentials already provisioned; confirm `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_MESSAGING_SID` secrets exist before send.

## Success criteria

- `/admin/revenue-reality` loads and shows the true numbers above.
- The blocker panel surfaces "Google Places API key invalid" as the #1 blocker without ambiguity.
- After secret is set + emergency blast is triggered, `acq_sms_logs` row count > 0, Twilio SID present, and the cockpit's SMS column flips from RED to a real number within 1 minute.
