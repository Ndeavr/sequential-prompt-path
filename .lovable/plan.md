## Contractor Revenue Forensics — drilldown & leak inspector

Goal: for every SMS-touched contractor, expose the **exact stage** where they stopped and surface the closest-to-paying record on top. No aggregates, append-only events, reconciled metrics.

---

### 1. Data layer

**Extend `contractor_funnel_events`** (already exists with `session_id/user_id/event_type/step/metadata/source/device/created_at`). Add append-only, non-destructive:

- `contractor_id uuid` (nullable — filled once known)
- `phone text`, `email text` (nullable — for pre-auth SMS/link events)
- `event_source text` (twilio / resend / stripe / app / webhook)
- `current_path text`
- indexes on `(phone)`, `(contractor_id, created_at desc)`, `(event_type, created_at desc)`

Keep every legacy row. Never overwrite.

**New view `v_contractor_journey`**: for each `(contractor_id | phone | email)` returns latest event, current stage, last known path, last activity, ordered timeline JSON.

**New view `v_revenue_rescue_queue`**: joins funnel + `acq_sms_logs` + `checkout_sessions` + `contractor_subscriptions` to bucket:
- clicked & not registered
- registered & not paid
- paid & not activated

Sorted by `last_activity_at desc`.

---

### 2. Event capture (append everywhere)

Emit into `contractor_funnel_events` from:

| Source | Events |
|---|---|
| Twilio webhook (`sms-status-webhook` edge fn) | `sms_queued`, `sms_sent`, `sms_delivered`, `sms_failed` |
| SMS link redirect edge fn | `sms_clicked` |
| Landing route effect | `landing_view` + `current_path` |
| Onboarding wizard steps | `registration_started`, `_step_company`, `_services`, `_territories`, `_reviews`, `_pricing`, `registration_completed` |
| Stripe create-checkout edge fn | `stripe_checkout_started` |
| Checkout page mount | `stripe_checkout_opened` |
| Stripe webhook | `stripe_payment_success`, `stripe_payment_failed` |
| Activation flow | `activation_started`, `activation_completed` |

All go through one helper `logFunnelEvent({ contractor_id?, phone?, email?, event_type, event_source, current_path?, metadata })`. Append-only.

---

### 3. Admin routes

**`/admin/contacted-contractors`** (new page)
- Table of every contractor touched by SMS (join `acq_sms_logs` + funnel).
- Columns: company, phone, current stage badge, last activity, "closest to $" score, row click → detail.
- Filters: stage, has-clicked, has-registered, unpaid.

**`/admin/contractor/:id`** (new page)
Four blocks:

1. **Identity** — company, phone, email, created, source.
2. **Current stage checklist** — the exact 10-step list from the request, ✓ / ✗ derived from event presence.
3. **Timeline** — chronological event list with time, type, source, metadata expand.
4. **Last known page** — big prominent card showing `current_path` from most recent event (e.g. `/entrepreneur/onboarding/pricing`).
5. **Abandonment Reason Engine** — computed:
   - current stage
   - time since last activity
   - previous event → next expected event
   - blocker label ("Pricing friction", "Checkout not opened", "Payment failed", …)

`:id` accepts `contractor_id` OR phone-hash fallback for pre-auth records.

---

### 4. Reconciliation logic (fix fake metrics)

Server-side view enforces monotonic funnel invariants:
```
if clicked_count > 0 → delivered_count >= clicked_count
if registered > 0    → clicked_count  >= registered
if paid > 0          → registered     >= paid
```
When violated, dashboard cards display **"Tracking Error Detected — reconcile pending"** with the offending pair, instead of the impossible number. A small `contractor_funnel_reconciliation_flags` table logs each anomaly for later backfill.

---

### 5. Revenue Rescue Queue widget

Sidebar/top card on `/admin/contacted-contractors` and `/admin/revenue-reality`:

- **🔥 HOT LEADS**
  - Clicked ↛ Registered
  - Registered ↛ Paid  ← highlighted red, this is where the first-paying contractor lives
  - Paid ↛ Activated
- Each item: company, stage, minutes since last activity, quick-link to `/admin/contractor/:id`, one-tap "Send rescue SMS" (dry-run default, respecting existing send-window policy).

---

### 6. Immediate deliverable

On first load of the new dashboard the "Registered ↛ Paid" bucket answers, for the single record described in the brief:
- company, phone, email
- last known page
- whether `stripe_checkout_started` was logged
- whether `stripe_payment_failed` exists
- exact abandonment stage + minutes elapsed

---

### Files to add / touch

- `supabase/migrations/*_funnel_forensics.sql` — column adds, indexes, views, reconciliation table, GRANTs, RLS (admin read only).
- `supabase/functions/sms-status-webhook/index.ts` — emit sms_* events (patch or create).
- `supabase/functions/stripe-webhook/index.ts` — emit stripe_* events.
- `src/lib/analytics/logFunnelEvent.ts` — single client helper; wraps insert.
- Wire calls in: onboarding wizard steps, checkout page mount, activation page, landing route effect.
- `src/pages/admin/PageContactedContractors.tsx` — new.
- `src/pages/admin/PageContractorForensics.tsx` — new (`/admin/contractor/:id`).
- `src/components/admin/forensics/StageChecklist.tsx`, `EventTimeline.tsx`, `AbandonmentReasonCard.tsx`, `LastKnownPageCard.tsx`, `RevenueRescueQueue.tsx`.
- `src/hooks/useContractorJourney.ts`, `useRevenueRescueQueue.ts`.
- Register routes in the admin router; add link from existing Revenue Reality dashboard.

### Out of scope (unless asked next)

- Backfilling historical Twilio/Stripe events from provider APIs.
- Automated rescue SMS sending (queue only; send button stays dry-run until confirmed).
- Cross-project telemetry.

Approve to build phase 1 (migration + capture helper + `/admin/contractor/:id` + rescue queue) in one pass.