## Objective

Build an admin view at `/admin/contractors-contacted` showing the last 100 contractors reached by the outreach engine, one row per contractor with the full funnel status, plus a one-click CSV export of every failure.

## Columns (per contractor)

| Column | Source |
|---|---|
| Business name | `contractor_leads.business_name` |
| Phone (E.164) | `contractor_leads.phone` |
| SMS sent | latest `contractor_outreach_logs` row where `channel='sms'` — status ∈ (`queued`, `sent`, `delivered`, `failed`) |
| Delivered | Twilio status callback → `delivered` |
| Clicked | `outreach_click_events` (or `contractor_outreach_logs.clicked_at`) joined by tracking token |
| Signup started | `contractor_funnel_events.event_type='signup_started'` matched by phone / lead_id |
| Signup completed | `event_type='signup_completed'` |
| Paid | `contractor_leads.pipeline_status='paid'` OR `stripe_payment_events` matched |
| Activation status | `contractor_leads.pipeline_status` (`profile_active` = ✅) |
| Failure code | latest `contractor_outreach_logs.failure_code` if last attempt failed |

## Deliverables

1. **Edge function `admin-contractors-contacted-report`**
   - Auth: admin only (`has_role(auth.uid(), 'admin')`).
   - Query: last 100 distinct contractor_leads with any outreach attempt in the last 30 days, joined to their latest SMS log, click events, funnel events, and pipeline status.
   - Returns `{ rows: ContactedRow[], failures: FailureRow[] }`.
   - CSV export mode via `?format=csv&scope=failures` returns text/csv of every row where `sms_status='failed'` OR `failure_code IS NOT NULL` in the last 30 days (not capped at 100).

2. **Page `/admin/contractors-contacted`** (`src/pages/admin/PageAdminContractorsContacted.tsx`)
   - Table with the 10 columns above, colored status pills (grey/blue/green/red).
   - Top strip: totals (Sent / Delivered / Clicked / Signup / Paid / Failed).
   - Two buttons: **"Export failures (CSV)"** and **"Refresh"**.
   - Empty state if no outreach in window.

3. **Router entry** in `src/app/router.tsx` under the admin cluster + link in `AdminSolicitationPage` sidebar.

## Data model notes

- Contractor identity = `contractor_leads.id`; join on `contractor_outreach_logs.lead_id`.
- Funnel events store `metadata.lead_id` or match by phone — do a phone-normalized join fallback.
- "Delivered" uses the terminal Twilio status stored on the log row (`provider_status='delivered'`).
- "Failed" = any log with `status='failed'` OR `failure_code` set (e.g. `PROVIDER_401`, `INVALID_PHONE`, `21610_stop`).

## Out of scope

- No changes to send/lookup/kill-switch logic.
- No SEO, landing, or Alex UI touches.
- Read-only view — no retry buttons (retry lives on `/admin/outreach-errors`).

## Success

- Page loads under 2s for 100 rows.
- CSV download of all failures (last 30 days) opens cleanly in Excel/Numbers.
- Admin can see, per contractor, exactly where the funnel breaks.
