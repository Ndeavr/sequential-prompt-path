## Objective

Prove the revenue gate end-to-end with a **real $1 Stripe payment** and then run a **Full Revenue Path Audit** from prospect → match eligibility, so we can see the true next bottleneck.

---

## Phase 1 — Real Stripe Payment Verification

### 1.1 Pre-payment snapshot
Build an admin panel `StripeRevenueGateAudit` at `/admin/revenue-gate-audit` that, given a contractor ID, captures and displays:

```
BEFORE PAYMENT
- account_status
- activation_status
- onboarding_status
- is_published
- is_discoverable
- is_accepting_appointments
- published_at
- stripe_customer_id / subscription_id
```

Snapshot stored in a new `revenue_gate_audit_runs` table (id, contractor_id, phase, snapshot jsonb, captured_at).

### 1.2 Trigger the real purchase
- Use the existing `/pro/:slug` → `create-activation-checkout` flow with the seeded E2E contractor.
- The admin clicks "Start Real $1 Test" button which:
  1. Captures BEFORE snapshot
  2. Opens a live Stripe Checkout URL in a new tab
  3. Starts polling `stripe-webhook` event log every 3s

### 1.3 Webhook observability
Add a `stripe_webhook_events` audit table (populated inside `stripe-webhook/index.ts`):
- stripe_event_id (unique)
- event_type
- received_at
- processed_at
- success (bool)
- error_message
- contractor_id (resolved)
- raw payload jsonb

Panel displays the matching event row in real-time.

### 1.4 Post-payment snapshot + diff
Once webhook is `processed_at != null`, re-snapshot and render a side-by-side diff highlighting each field that changed. Expected green: `account_status=active`, `activation_status=activated`, `is_published=true`, `is_discoverable=true`, `published_at` set.

### 1.5 Visibility verification (4 automated checks)
Right after diff, panel runs and displays PASS/FAIL for:
1. **Search**: query `contractors-api` for the contractor's trade/city → contractor present
2. **Alex matching**: invoke `alex-best-match-select` with matching criteria → contractor returned
3. **Homeowner recommendations**: invoke recommendation edge fn → contractor present
4. **Public URL**: fetch `/entrepreneur/:slug` → HTTP 200 + contractor name in HTML

Overall verdict: `REVENUE GATE OPEN` / `BLOCKED AT STEP X`.

---

## Phase 2 — Full Revenue Path Audit

New edge function `revenue-path-audit` + admin page `/admin/revenue-path-audit` that computes, over a rolling 30-day window:

```
Stage                       Count    Conv%    Blocker
────────────────────────────────────────────────────────
Prospects imported             …        —         —
SMS/Email dispatched           …        …%      …
SMS delivered (Twilio)         …        …%      …
Email delivered (Resend)       …        …%      …
Clicks (/r/{id})               …        …%      …
Signups / onboarding start     …        …%      …
Stripe checkout created        …        …%      …
Stripe payment succeeded       …        …%      …
Webhook processed              …        …%      …
Contractor activated           …        …%      …
Visible in search              …        …%      …
Eligible in Alex matching      …        …%      …
```

Data sources (already in DB):
- `contractor_prospects`, `contractor_leads`
- `outreach_sms_events`, `outreach_email_events`
- `acquisition_events` (clicks)
- `contractor_activation_events`, `contractors`
- `stripe_webhook_events` (new)
- `checkout_sessions`

For each stage, `Blocker` shows the top failure reason (e.g. "landline_or_unreachable", "RESEND_400", "no_cta"). Auto-highlights the first stage where conversion < 30% as the **current bottleneck**.

---

## Technical Notes

- No schema breaks: add `stripe_webhook_events` and `revenue_gate_audit_runs` only.
- `stripe-webhook` gets a wrapper that logs every event to the new audit table (success or fail) before doing work — gives us the missing observability.
- Visibility checks reuse existing edge functions; no duplicated logic.
- All admin pages wrapped in `SectionErrorBoundary` per prior hardening.

---

## Success

- One real $1 test produces a green BEFORE→AFTER diff + 4/4 visibility PASS
- Revenue Path Audit renders with real counts and clearly names the next bottleneck (expected: SMS or email delivery upstream)
- Zero changes required to business logic in matching, activation, or Stripe — this phase is purely **proof + observability**
