# Unlock the 81 pending prospects — audit done, here is the execution plan

## STEP 1 — Audit result (already run, real production data)

The 81 pending rows in `acquisition_queue` (state `ready_sms`) are not Laval-only and are **not** blocked by `missing_website_url`. Verified counts:

| Primary blocker | Count | Has email | Has website |
|---|---|---|---|
| SMS undelivered 30006 (landline / unreachable carrier) | 61 | 23 | 61 |
| SMS undelivered 30034 (A2P 10DLC campaign not registered) | 13 | 6 | 13 |
| Never attempted (no phone data quality yet) | 4 | 0 | 0 |
| Other failures (30003 / 30005) | 2 | 1 | 2 |
| Delivered already | 1 | 1 | 1 |

Other facts confirmed: 0 missing city blockers of note, 0 missing category, 0 missing phone, 74/81 attempted in the last 30 days (so the 30-day `prospect_cooldown_days` is what keeps them frozen), 78/81 sit at SMS eligibility tier C / line type `unknown` because Twilio Line Type Intelligence is unavailable in Canada (error 60601).

Conclusion: the binding constraint is **channel**, not inventory. Most of these numbers cannot ever receive SMS. The unlock is the email channel, which already exists.

## STEP 2 — What will be done

1. **Reclassify, don't re-SMS.** Mark the 61 landline-confirmed prospects as `sms_ineligible` with reason `landline_confirmed_30006` so they stop consuming SMS capacity and stop being counted as "pending SMS". Route them to the email channel in the same existing queue (`channel = 'email'`, state `ready_email`). No new table, no new queue.
2. **Email enrichment for the 51 without an email.** Use the existing `enrich-prospect` / `enrich-official-website` capability against the website already stored on each row (all 74 have one). Only store an email discovered on the business's own verified domain; record provenance in `email_source_url`. No fabricated addresses, no guessed `info@` patterns.
3. **CASL unchanged.** The website requirement stays exactly as-is: it is the public-business-contact evidence. Nothing about consent, opt-out, suppression, dedupe, caps or kill switch is relaxed.
4. **Cooldown handling.** Only the cooldown for the *email* channel is evaluated for these rows; the SMS attempt that hard-failed with 30006 is treated as a non-contact (the message never reached anyone), which is the semantically correct read and does not increase contact frequency for any human.
5. **A2P 30034 group (13 rows).** This is a genuine external blocker: the Twilio A2P 10DLC / Canadian short-code brand-campaign registration is not approved for this sender. These 13 will be routed to email as well and flagged in the report; SMS retry stays blocked until registration clears.

## STEP 3 — Re-evaluate and send LIVE

Re-run the existing pipeline in place: `acquisition-queue-worker` → `send-verified-batch` with `dry_run: false`, email channel. Every message carries the contractor-specific activation token and the canonical `/unpro/activate/:token` link, sent through `outreach-resend-send` (the already-wired Resend path, French templates).

Caps respected: `max_daily_global` 150, `max_daily_per_channel` 25 — so the first live email wave is capped at 25 and the rest flow on the hourly cron.

## STEP 4 — Verify the money path

Take one freshly generated activation URL and walk it end to end without paying: token resolves → correct contractor identity → $1/7 days offer → `create-activation-checkout` returns a live `cs_live_...` session with contractor metadata attached → confirm `stripe-webhook` maps `checkout.session.completed` back to that contractor id.

## STEP 5 — Report

Final numbers reported in the exact requested format (pending start, enriched, still blocked, eligible, promoted, SMS attempted/delivered/failed, email fallback, links created, clicks, checkout starts, $1 paid, activated) plus the top 5 remaining blockers with counts.

## Technical details

- Data change: `verified_contractor_prospects.sms_eligible=false`, `sms_eligibility_tier='D'`, `rejection_reason_code='landline_confirmed_30006'` for the 61; `acquisition_queue.state='ready_email'`, `channel='email'` for all routable rows. Done via the insert/update tool, not a schema migration.
- Enrichment: existing `enrich-prospect` edge function, batched, writing `email`, `email_source_url`, `last_enriched_at` only when the email's domain matches the stored `website_url` domain.
- Sender: existing `send-verified-batch` email branch (`sendEmailViaResend` → `outreach-resend-send`). No new sender.
- Monotonic `enforce_monotonic_outreach_status` trigger is respected — no downgrade of any `paid`/`delivered` row.
- No SEO, UI polish, CRM or architecture work in this run.
