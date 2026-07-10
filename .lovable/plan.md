## The problem (root cause)

The forensics page is reading from the wrong table. Real onboarding data lives in `contractor_leads` + `contractor_outreach_logs`; the new view `v_contractor_journey_latest` reads from `contractor_funnel_events`, which is essentially empty (no phone, email, or contractor_id populated). That's why the drilldown shows "Unknown / —" for everyone while the dashboard correctly counts 27 sent / 1 clicked / 1 inscription from `contractor_leads`.

The "1 inscription" is already identifiable in the DB:

```
Couvreurs Therrien Inc. — 514-573-4159 — Verdun
last_sms_at:            2026-06-14 17:30
clicked_at:             2026-06-14 18:00
onboarding_started_at:  2026-06-14 17:30
pipeline_status:        onboarding_started
paid_at:                null
```

That single lead should surface as the top HOT lead. It doesn't because the forensics view never joins to `contractor_leads`.

## Scope

Two things: (1) fix the forensics data source so it uses the real onboarding tables, (2) fix dark-mode readability on all admin pages.

## Plan

### 1. Unified journey view (SQL migration)

Create `v_contractor_forensic_journey` that UNIONs three sources into one event stream keyed by `lead_id`:

- `contractor_leads` → derived events from `last_sms_at`, `opened_at`, `clicked_at`, `onboarding_started_at`, `payment_started_at`, `paid_at`, `activation_status`
- `contractor_outreach_logs` → real SMS/email events with status, error_code, error_message
- `contractor_funnel_events` → app-side events (landing_viewed, plan_selected, etc.) joined on phone/email when populated

Create `v_contractor_forensic_state` (one row per lead) with identity (company, phone, city), current_stage, last_known_path, rescue_bucket, and boolean checkmarks for each stage (has_sms_sent, has_sms_delivered, has_clicked, has_registration_started, has_stripe_started, has_paid, has_activated).

### 2. Rewire admin forensics pages

- `useContractorJourney(id)` → query `v_contractor_forensic_state` + `v_contractor_forensic_journey` (accept lead_id, phone, or company slug)
- `useRevenueRescueQueue()` → order by rescue bucket priority (registered_not_paid → clicked_not_registered → paid_not_activated), so Couvreurs Therrien surfaces at top
- `useContactedContractors()` → drop the `v_contractor_journey_latest` source; use `v_contractor_forensic_state`
- `PageContractorForensics` → never render "Unknown" when any identity field exists; fall back gracefully company → phone → email → id

### 3. DATA INTEGRITY alert

Add a red banner on `/admin/contacted-contractors` and `/admin/revenue-debug` when `SUM(has_clicked) > SUM(has_sms_delivered)` or `SUM(has_paid) > SUM(has_registration)`. Banner shows the failing invariant + record IDs so tracking bugs are impossible to hide.

### 4. New page `/admin/revenue-debug`

Raw event timeline per contractor, one contractor per collapsible block, 11-row grid:

```text
SMS SENT · SMS DELIVERED · LINK CLICKED · LANDING · REGISTRATION STARTED ·
OTP VERIFIED · PLAN SELECTED · STRIPE STARTED · STRIPE SUCCESS ·
PROFILE COMPLETED · ACTIVATED
```

Each cell = timestamp + source (twilio/app/stripe) or `—`. No aggregates, no percentages. Sorted by proximity-to-revenue.

### 5. Dark-mode readability pass

Audit `.admin-theme` scope. Replace `text-muted-foreground` used on dark cards with `.text-readable-muted` token (≥ AA contrast). Update `src/index.css`:

```css
.admin-theme {
  --muted-foreground: 203 213 225;  /* slate-300, AA on #050816 */
}
.admin-theme .text-muted-foreground { color: rgb(203 213 225); }
```

Sweep the six flagged surfaces (title, filters, table headers, activity column, hot leads block, stage pills) so no text falls below AA. Never touch `.landing-warm` scope.

## Files to change

- **migration** — create `v_contractor_forensic_journey` + `v_contractor_forensic_state`, drop stale `v_contractor_journey_latest` / `v_revenue_rescue_queue`
- `src/hooks/useContractorJourney.ts` — point at new views, accept lead_id
- `src/pages/admin/PageContractorForensics.tsx` — resolve identity, never show "Unknown" when data exists
- `src/pages/admin/PageContactedContractors.tsx` — new view + DATA INTEGRITY banner
- `src/components/admin/forensics/RevenueRescueQueue.tsx` — new view
- **new** `src/pages/admin/PageRevenueDebug.tsx` — raw 11-column event grid
- **new** `src/components/admin/forensics/DataIntegrityBanner.tsx`
- `src/app/router.tsx` — register `/admin/revenue-debug`
- `src/index.css` — admin-theme readable tokens

## Out of scope

- Backfilling `contractor_funnel_events` for historical leads
- Fixing Twilio delivery webhook (separate — that's why `has_sms_delivered = 0`; will be surfaced by the DATA INTEGRITY banner but not repaired here)
- Automated rescue SMS
