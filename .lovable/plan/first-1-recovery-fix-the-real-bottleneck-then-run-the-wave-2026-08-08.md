# First $1 Recovery — fix the real bottleneck, then run the wave

## What the production data actually says

I queried live data before planning. The premise "0 clicks" is wrong:

- 150 prospects at `delivered`, 86 `failed`, 3 `sent`, 17 untouched.
- 239 activation tokens issued, **8 tokens clicked** (most recent: Noble Quebec Laval, Aug 7 12:45 UTC). Click tracking in `activation-token-resolve` works — it records click + landing events.
- 142 second-touch SMS already sent.
- **Zero checkout sessions created since July 24.** Not one of the 8 clickers reached a Stripe $1 checkout.

So the narrowest bottleneck is not delivery and not tracking. It is **click → checkout**: people open the activation page and leave without a checkout being created (or a created checkout is never recorded). That is where this run focuses.

## Plan

### 1. Prove the activation path end to end (before any sending)
- Take one real clicked prospect's token, hit `activation-token-resolve` in production, confirm prospect resolution and click recording.
- Load `/unpro/activate/:token` in a mobile viewport with Playwright: verify page renders, CTA visible above the fold, no auth wall, no redirect to home/login, readable contrast.
- Click the CTA in the browser and observe what `create-activation-checkout` returns: real Stripe URL, live mode, $1 / 7-day trial, correct product/price, prospect metadata, success/cancel URLs. Stop before paying.
- Inspect edge function logs for the 8 real clickers to see whether the CTA was ever invoked and what it returned. This distinguishes "checkout call fails" from "nobody clicks the button".

### 2. Fix whatever step 1 breaks
Fix only the failing step. Likely candidates based on the evidence: checkout invocation erroring silently, checkout session not persisted (so admin shows nothing even if Stripe worked), or the page's CTA being below the fold / blocked on mobile.

### 3. Close the measurement gap
Record `stripe_checkout_created` / `checkout_opened` for the activation flow into the existing engagement-event path used by `activation-token-resolve` (no new analytics stack, no new tables unless a required column is missing). Ensure every checkout attempt is persisted with prospect id + token so admin can see click → checkout → paid.

### 4. Activation page friction pass (mobile-first, only if step 1 shows friction)
Above the fold: business name, "Votre profil professionnel est prêt", "1 $ pendant 7 jours", one dominant CTA. Pre-fill scraped data, no form before payment, no double OTP.

### 5. Build the real recovery audience
From delivered prospects, exclude paid, activated, already-clicked, opt-outs, invalid contacts, and anyone inside the existing dedup/CASL window. Segment A (mobile delivered no click), B (engaged no activation), C (landline with email), D (failed channel), E (blocked) and show exact counts in admin before sending.

### 6. Execute the wave through existing senders
- Touch 3 via `second-touch-outreach` with a new angle (not a copy of touch 2), reusing the proven `/unpro/activate/:token` link and existing STOP handling.
- Scarcity line only if `territory_availability` verifies remaining Laval plomberie spots; otherwise the neutral copy.
- Email fallback for segment C through the existing Resend path, link tested first.

### 7. Measure, then report the next bottleneck
After the wave: delivered, clicked, page viewed, checkout created, paid, activated, plus the four conversion rates. If no $1 lands, name the next narrowest step with real numbers rather than shipping unrelated features.

## Technical notes
- Tables in play: `verified_contractor_prospects`, `verified_prospect_tokens`, `acq_sms_logs`, `checkout_sessions`, `sniper_engagement_events` / `pipeline_engagement_events`.
- Functions in play: `activation-token-resolve`, `create-activation-checkout`, `stripe-webhook`, `second-touch-outreach`.
- Admin surface: extend `/admin/launch-control` and `/admin/crm`; no new dashboard.
- No changes to scraping, pricing, SEO, or unrelated systems.
