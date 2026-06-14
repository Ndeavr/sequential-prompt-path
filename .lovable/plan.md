# Autonomous Contractor Acquisition Flow

Goal: a contractor lead, once discovered, walks itself all the way to `profile_active` without any admin button. Admin sees real counters only — never a fake "done".

## 1. Pipeline status model

Single source of truth on `contractor_leads` (or `outbound_leads`, picking the existing canonical table during build):

`pipeline_status` enum:
`discovered → enriched → scored → message_ready → sms_sent → email_sent → opened → clicked → onboarding_started → payment_started → paid → profile_active`
Plus terminal: `failed` (with `failure_code`, e.g. `MISSING_CONTACT`, `SMS_QUOTA_REACHED`, `EMAIL_QUOTA_REACHED`, `PROVIDER_ERROR`).

Uses canonical `FailureCode` / `BlockReason` and `platform_operation_outcomes` per the Production Reliability Framework.

## 2. New table: `contractor_outreach_logs`

Fields: `id, contractor_id, lead_id, channel ('sms'|'email'), template_key, message_body, status, provider_response jsonb, sent_at, opened_at, clicked_at, error_code, error_message, created_at`.
RLS: service_role full; admins SELECT via `has_role`. No anon.

## 3. Edge functions

**`acquisition-autopilot`** (cron every 15 min via pg_cron)
- Picks leads in `discovered/enriched/scored/message_ready` that have no outreach yet today.
- Enforces daily limits per UTC day from `contractor_outreach_logs` counts:
  SMS ≤ 50, Email ≤ 100, new activation attempts ≤ 25.
- For each eligible lead:
  1. If not `enriched`, call existing enrichment (Firecrawl/NEQ/RBQ) → `enriched`.
  2. Compute fit score → `scored`.
  3. Generate private onboarding token + URL `/pro/onboarding/:token` → `message_ready`.
  4. Routing rules:
     - phone + email → SMS now, schedule email +10 min (queued row).
     - phone only → SMS.
     - email only → email.
     - neither → `failed` with `MISSING_CONTACT`.
  5. Send via existing Twilio + Resend wrappers, log every attempt in `contractor_outreach_logs`, advance status to `sms_sent` / `email_sent`.
- Reports outcome via `reportOutcome()` — never returns success unless ≥1 message actually sent.

**`acquisition-followup-tick`** (same cron, second pass)
- Sends the scheduled +10 min email rows.
- Marks `opened` / `clicked` from webhook events.

**`pro-onboarding-token`** (public, no auth)
- Resolves the private token → returns lead snapshot (name, category, city, Google rating, RBQ/NEQ, fit score, why-selected reasons, recommended plan).

**`pro-onboarding-checkout`**
- Creates Stripe Checkout for the recommended plan (existing `pro-founder-checkout-guest` reused). Sets `payment_started`.

**`pro-onboarding-webhook`** (Stripe)
- On `checkout.session.completed`: status → `paid` → publish contractor profile (`is_published=true`, matching enabled) → `profile_active`.
- Trigger confirmation SMS + email to contractor and admin notification row.

## 4. Webhooks for engagement

Twilio + Resend webhooks update `contractor_outreach_logs.opened_at` / `clicked_at` and bump lead to `opened` / `clicked`.

## 5. Messages (locked copy)

SMS:
> Bonjour {Prénom}, UNPRO peut recommander {BusinessName} à des propriétaires qualifiés dans votre secteur. Pas des leads partagés: rendez-vous exclusifs garantis. Activez votre profil ici: {private_link}

Email subject:
> {BusinessName} peut maintenant être recommandé par UNPRO

Email body: exact text from request, `{private_link}` injected, brand identity filter applied (existing layer).

## 6. Private onboarding page `/pro/onboarding/:token`

New `PageProPrivateOnboarding.tsx`. Sections: business identity, category, city, Google rating (if any), RBQ/NEQ, UNPRO Fit Score ring, "Pourquoi vous avez été sélectionné" bullets, recommended plan card, single Stripe activation CTA (reuses `FounderOfferCard` checkoutUrl pattern). No human-callout popup (already excluded prefix).

## 7. Admin dashboard `/admin/acquisition-autopilot`

Replaces any "Start outreach" button. Cards driven by real SQL counts (today, UTC):
- Leads discovered (24h)
- Messages sent today (SMS / Email split, vs caps 50 / 100)
- Replies / Opens / Clicks
- Onboarding started
- Payments (count + revenue)
- Failures grouped by `failure_code` with last error sample

Empty/zero states display "0 envois aujourd'hui — raison: {BlockReason}" — never "Terminé".

## 8. Removals

- Delete/disable any "Approve & send" admin gate in current outbound approval flow for this autopilot stream (keep manual queue available behind a feature flag for non-autopilot campaigns).
- Remove the "manual start" CTA on contractor onboarding admin views.

## 9. Reliability rules applied

- `withRetry` on Twilio/Resend/Stripe calls.
- Explicit state machine on `pipeline_status` (no silent jumps).
- `reportOutcome` on every edge function with `revenue_impact_cents` on paid.
- Auto-retry schedule 5m / 30m / 2h / 12h on transient failures via existing reliability backoff.

## 10. Migrations needed

1. `contractor_outreach_logs` table + grants + RLS + indexes (`contractor_id`, `sent_at`, `status`).
2. `pipeline_status` enum + columns on canonical leads table; backfill `discovered` for nulls.
3. `acquisition_followup_queue` (lead_id, channel, scheduled_at, sent_at).
4. pg_cron job `*/15 * * * *` → `acquisition-autopilot`, `*/5 * * * *` → `acquisition-followup-tick`.

## 11. Open questions before build

- Canonical leads table to attach pipeline_status to: `contractor_leads`, `outbound_leads`, or `launch_leads`? (will inspect and pick one — won't create a parallel one)
- Use existing Twilio + Resend wrappers, or the in-house contact-router? Default: contact-router so suppression + brand filter are respected.
- Reuse `pro-founder-checkout-guest` Stripe coupon (1 $ / 7 d) for autopilot, or full price? Default: same Founder $1/7d while founder spots remain, else full plan price.

I'll confirm these three during build unless you answer now.
