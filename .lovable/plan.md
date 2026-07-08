## Objective
Drive a real contractor signup end-to-end with Playwright, pause at Stripe Checkout so you can pay, then monitor all downstream systems and audit every public path that could leave a paying contractor invisible.

## Prereqs I need to confirm before running

1. **Test email inbox.** Signup requires magic link / email OTP. Playwright cannot receive email. Pick one:
   - **(A)** You give me a mailbox I can poll (e.g. `admin+e2etest-<ts>@unpro.ca` if Resend inbound / forwarding to a mailbox we can query, or a Gmail with app password).
   - **(B)** I use the admin service-role path: create the `auth.users` row + confirm email server-side via edge function, then Playwright resumes at `/role → /entrepreneur/checkout`.
   - **(C)** You complete the email click manually on your phone alongside the Stripe payment.
   Default if you don't answer: **(B)** — fastest, most reliable, still exercises the real webhook + activation + email + visibility chain.

2. **$1 checkout.** Stripe is in **live** mode (`pk_live_…`). There is no built-in $1 plan. Pick one:
   - **(A)** I create a one-off Stripe price of $1 CAD tied to a temporary "E2E Test" product and pass it to `create-contractor-checkout` via a `price_id_override` (small code addition, revert after).
   - **(B)** I generate a 100%-off (or 99.4%-off from Recrue 149 → ~$1) coupon and apply it at checkout.
   - **(C)** You accept paying the real Recrue $149 once (refundable via Stripe).
   Default if you don't answer: **(B)** — cleanest, no schema change, verifies coupon path too.

## Test flow (Playwright script under `/tmp/browser/onboarding-e2e/`)

```
1. Open http://localhost:8080/role → select "Entrepreneur"
2. /signup → email = e2e+<ts>@unpro.ca
   → path (B) above: call admin edge fn `e2e-confirm-user` to confirm + mint session
   → inject Supabase session into localStorage
3. Navigate through /entrepreneur/onboarding → /entrepreneur/plan
   Fill: business_name, phone, RBQ, website, city
4. Land on /entrepreneur/checkout → click "Activer mon profil"
5. Wait for Stripe URL (intercept `create-contractor-checkout` response OR window navigation)
6. PAUSE → print the checkout URL to console + save to /tmp/browser/onboarding-e2e/checkout_url.txt
```

At this point I return control. You open the URL on your phone, apply the coupon (if path B for pricing), complete the $1 payment.

## Post-payment monitor (I poll every 5s for up to 3 min)

For contractor `email = e2e+<ts>@unpro.ca`:

| # | Check | Source | PASS criteria |
|---|-------|--------|----------------|
| 1 | Stripe webhook received | `launch_pipeline_events` where `agent='launch-stripe-webhook'` + `payload.session_id` | 1+ row within 60s |
| 2 | Contractor activated | `contractors.status = 'active'` + `activated_at IS NOT NULL` | row exists |
| 3 | Welcome email sent | `email_send_log` dedup by `message_id` where `template_name='entrepreneur-welcome'` + recipient | status=`sent` |
| 4 | Public profile visible | GET `/entrepreneur/:slug` returns 200 + name renders | HTML contains business_name |
| 5 | Subscription recorded | `contractors.stripe_subscription_id` set + `contractor_subscriptions` row | both present |

Each check reports `PASS/FAIL @ <ISO timestamp>` + message ID / row ID.

## Invisibility audit (independent of the E2E)

For a paying contractor to be actually reachable, ALL of these must be true. I'll query each and flag any that would silently drop them:

- `contractors.status = 'active'` AND `contractors.published = true`
- `contractors.city_id` set AND matches a served city
- `contractors.trade_ids` non-empty AND matches active categories
- `contractor_scores` row exists (matching engine gate)
- `contractor_service_regions` rows exist (regional visibility)
- `v_contractor_recommendation_score` view returns the row (recommendation eligibility)
- RLS: anon SELECT on `contractors_public` view returns the row
- Sitemap: `/sitemap-contractors.xml` includes `/entrepreneur/:slug`
- Search: `contractors-api` edge function public search returns the row
- Territory: `territory_slots` has capacity (not saturated → hidden)
- Onboarding gate: `contractor_onboarding_state.completed_at` set (else PageContractorActivated redirects loop)

I'll produce a table: `check | result | fix_needed`.

## Deliverables

- `/tmp/browser/onboarding-e2e/checkout_url.txt` (returned to you mid-run)
- Screenshots at each Playwright step
- Final report: 5 numbered PASS/FAIL rows with timestamps + IDs
- Invisibility audit table with any red flags

## Decisions I need from you

1. Email path: **A / B / C** (default B)
2. Pricing path: **A / B / C** (default B — coupon)
3. Confirm you're OK with me creating one temp Stripe coupon `E2E_TEST_<ts>` (auto-expires in 24h)

Reply "go with defaults" to run B+B, or specify overrides.
