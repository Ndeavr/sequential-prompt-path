---
name: Email Eligible Fallback
description: Carrier-dead SMS prospects enter the compliant email wave via `email_eligible` flag without downgrading monotonic outreach_status
type: feature
---

# Email Eligible Fallback (carrier-dead SMS → email)

**Rule:** Prospects whose phone is carrier-proven dead (Twilio 30003–30008, 30034, 21211, 21408, 21612, 21614; `landline_confirmed_30006`; tier D landline) get `verified_contractor_prospects.email_eligible = true` and may be emailed even when `outreach_status` (sent/delivered/clicked) cannot be downgraded. The monotonic trigger preserves status; email sends stamp `email_sent_at` / provider id only.

**Never:** infer email consent, invent contact data, downgrade outreach_status, or email anyone on `suppression_index` (checked via `is_email_suppressed` at send time) or within the 7-day email cooldown (`email_sent_at`).

**Backfill gates (all required):** real email + verified + quality ≥80 + CASL provenance (website/Google listing/phone source URL) + not terminal (registered/payment_started/paid/activated) + not suppressed + hard carrier-dead evidence. Twilio 21610 (SMS opt-out) is excluded from eligibility.

**send-verified-batch behavior (channel:"email"):** eligibility = `outreach_status IN (none,failed) OR email_eligible=true`; 24h dup guard ignores `undelivered`/`failed` SMS log rows (never reached a human) and also scans `email_send_log` `acq-<prospectId>-*` sent rows.

**First production run (2026-08-25):** 150 flagged, 25 emailed (6 warm + 19 previously-clicked), 25/25 Resend accepted, 8 clicks in 30 min, 0 conversions yet. Run id `9938c5eb-33cd-4ead-bf1f-332b38f5049e`.
