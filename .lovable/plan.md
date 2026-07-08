## Post-Payment Audit — Contractor `72bc8179-d836-497d-8114-e0fcd773281b`

Contractor: `e2e+run1783477950@unpro.ca` · Plan: **Recrue** · Sub: `sub_1TqmPrCvZwK1QnPVypk1H1xs` · Customer: `cus_UqSCJFKK3PoBlv`

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Contractor appears in public search | **PASS (technical) / FAIL (practical)** | Flags OK (`is_published=t`, `is_discoverable=t`), but `slug=NULL`, `city=NULL`, `business_name` is the raw email, and no `contractor_category_assignments` / `contractor_service_areas` rows — invisible to any faceted search on city/category/name. |
| 2 | Appears in recommendation engine candidates | **PASS** | `v_contractor_recommendation_score` returns the row with `plan_code=recrue`, score `11.00`. |
| 3 | Can receive appointments | **FAIL** | `is_accepting_appointments=t` on the flag, but `booking_enabled=false` AND `booking_page_published=false` → booking engine will refuse to schedule. |
| 4 | Profile URL returns 200 | **PASS** | `GET https://unpro.ca/entrepreneur/72bc8179…` → HTTP 200 (SPA renders, but content will be a stub because no slug/business data). |
| 5 | Stripe customer ID stored | **PASS** | `contractor_subscriptions.stripe_customer_id = cus_UqSCJFKK3PoBlv`. |
| 6 | Subscription renewal date stored correctly | **PASS** | `current_period_start = 2026-07-08 03:44:52 UTC`, `current_period_end = 2026-08-08 03:44:52 UTC` (monthly cycle, aligned with Stripe). |
| 7 | Welcome email delivered | **FAIL** | `email_send_log` has zero rows for `recipient_email ILIKE 'e2e+run1783477950%'`. The `stripe-webhook` fix restored the subscription but never triggered a post-activation welcome email. |
| 8 | No hidden blockers preventing future recommendations | **FAIL** | Multiple blockers:<br>• `slug=NULL` → no public URL slug, no SEO, no share cards.<br>• `city=NULL`, no `contractor_service_areas` → matching engine can't geo-target.<br>• No `contractor_category_assignments` → matching engine can't category-target.<br>• `booking_enabled=false` → recommendations that require bookable pros will filter this contractor out.<br>• `verification_status=unverified` → any policy that gates on verification will exclude it.<br>• `plans.id` (UUID) is stored in `contractor_subscriptions.plan_id`, but `v_contractor_recommendation_score` joins on `plans.code = cs.plan_id` — the join FAILS and the view silently falls back to defaults (`plan_code='recrue'`, multipliers 1.0). Any future upgrade to Pro/Premium/Élite/Signature will NOT lift multipliers until either the column is written as the plan code or the view is rewritten to join on `plans.id`.

### Summary

- **PASS (4):** 2, 4, 5, 6
- **FAIL (3):** 3, 7, 8
- **Mixed (1):** 1 — technically visible, practically empty

### Recommended follow-up fixes (separate plan/turn)

1. Backfill `contractors.slug`, `city`, `business_name`, category assignments, service areas.
2. Enable `booking_enabled` + `booking_page_published` on plan activation (or gate criterion 3 differently).
3. Fire welcome email from `stripe-webhook` on `checkout.session.completed` / `customer.subscription.created`; add it to the manual-recovery path too.
4. Standardize plan reference: either store `plans.code` in `contractor_subscriptions.plan_id` (rename/refactor) or change `v_contractor_recommendation_score` to `JOIN plans p ON p.id::text = cs.plan_id`.
5. Decide whether recommendation eligibility should require `verification_status <> 'unverified'`; if so, add a verification step to activation.

Awaiting your go-ahead before implementing any of these — this plan is audit-only.