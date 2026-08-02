## Situation (measured, not assumed)

| Signal | Reality |
|---|---|
| SMS sent (Jul 25–31) | 234, all with Twilio SIDs |
| Deliveries recorded | 0 |
| Human clicks | 1 |
| $1 payments | 0 |
| Sending controls | OFF since Jul 30 |
| Fresh sendable prospects | 6 |

The pipeline **sends**. What is unproven is everything after the send: delivery, click, checkout, payment. Zero deliveries recorded across 234 messages is the single most dangerous unknown — it could mean carrier filtering (nothing ever arrived) or just a missing status webhook. That question gets answered first, because every downstream fix depends on the answer.

## Step 1 — Delivery truth (no new sends)

Pull real status for the 234 existing SIDs directly from Twilio and write it back.

- New edge function `twilio-delivery-reconcile`: batch-fetch message status for every `outreach_twilio_sid`, persist `delivered / undelivered / failed` + error code into `verified_contractor_prospects.outreach_delivered_at` / `outreach_failure_reason`, and mirror rows into `acq_sms_logs`.
- Register the Twilio status-callback webhook so future sends self-reconcile.

**Gate:** if delivery rate is near zero with error codes 30032/30007/60601, the problem is carrier registration, not copy — the run pivots to email-first (Step 4) instead of burning more SMS.

## Step 2 — Prove the money path with a real card

Before scaling outreach, walk one token end-to-end:

`/unpro/activate/:token` → `activation-token-resolve` → `create-activation-checkout` → Stripe → webhook → payment row.

- Confirm the Stripe webhook actually writes to `contractor_recruitment_payments` / `unpro_payment_activation_audit` (both are currently empty — this path has never completed in production).
- Run one live $1 charge on a real card, then refund it. This converts "first dollar" from a hope into a verified mechanism.

## Step 3 — Re-arm sending with safe caps

Flip `recruitment_controls`: `global_enabled=true`, `autonomous_enqueue_enabled=true`, keep `max_daily_global=25`, cooldown intact. Add an explicit admin kill-switch read on every send.

## Step 4 — Second touch on the 234 (the fastest revenue)

These contractors are already scraped, verified and phone-validated. They cost nothing to reach again.

- **Delivered but unclicked** → one short second-touch SMS with a rewritten one-line hook and a clean `unpro.ca/r/:token` link.
- **Undelivered / no email-less** → Resend email fallback with the same activation link (`RESEND_API_KEY` is live).
- Every touch writes a `click_events`-linked tracking token so attribution is unambiguous.

## Step 5 — Refill the pool

Run the Google Places scraper (`GOOGLE_PLACES_API_KEY` is present) for 2 city × category cells with the strongest prior response, enrich to `verified` + `sms_eligible`, and feed the 25/day queue.

## Step 6 — Live reconciliation

Extend `/admin/launch-control` with a single truth strip: **Sent → Delivered → Clicked → Checkout opened → Paid**, sourced from the reconciled tables, refreshing every 10 s. Stop the run the moment the first payment lands and report the contractor, SID, and Stripe charge ID.

## Technical notes

- New: `supabase/functions/twilio-delivery-reconcile/index.ts`, Twilio status-callback handler.
- Modified: `send-verified-batch` (attach status callback URL), Stripe webhook handler (persist activation payments), `PageAdminLaunchControl.tsx` (reconciliation strip).
- No changes to SEO, sitemap, AI corpus, or content systems.
- No new SMS is sent until Step 1 returns delivery truth and Step 2 proves the payment path.

## Definition of done

A real contractor, reached by this pipeline today, has a Stripe charge of $1.00 recorded in the database and visible on `/admin/launch-control` — with the full Sent → Delivered → Clicked → Paid chain reconciled for that one prospect.
