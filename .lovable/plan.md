## Objective
Ship the First Dollar Tracker fixes to production TODAY. Ignore unrelated PII/GRANT findings (out of scope — logged as follow-up). Then run one live end-to-end test for Electro Pompe.

## Scope confirmed in-scope
- Publish current front-end (tracker fixes already merged, verified at 390/984/1280 last turn).
- Log unrelated PII/GRANT findings as a follow-up task, do NOT block deploy.
- Run one live end-to-end verification against the active run (Electro Pompe, prospect `aa4ebd75…`, lead `dd9f83bb…`, SID `SM7770bec7…`).

## Out of scope
PII/GRANT security findings on pre-existing tables, SEO, sitemaps, AI corpus, role switcher, affiliate flow, redesign work.

## Steps

### 1. Publish
- Call `preview_ui--publish` immediately. Do not gate on unrelated security scan warnings.
- Record the returned Lovable URL.

### 2. Log follow-up for unrelated findings
- File the PII column-level GRANT findings as a follow-up (no code change this turn), so they aren't lost.

### 3. Live end-to-end verification
- Re-query `v_first_dollar_tracker` and `contractor-revenue-timeline?prospect_id=aa4ebd75…` on production once deploy is live.
- Confirm:
  - SMS Sent = success with real SID.
  - Delivery = pending with `delivery_callback_missing` warning (not "failed").
  - Click / Registration / OTP / Stripe / Activation = pending unless explicitly linked by prospect_id / lead_id / token / SID / phone / stripe_session.
  - `conversion_next_action` = "Clic sur le lien d'activation".
  - `technical_next_action` = "Réparer StatusCallback Twilio".
- Load `/admin/acquisition-pipeline` on production via Playwright at 390 / 984 / 1280; screenshot the First Dollar block + Revenue Timeline panel; confirm no historical bleed.

### 4. Advance the real run (only if a real production blocker is hit)
- If the tracker still shows a historical stage as complete → stop, repair, republish.
- If Twilio StatusCallback is the only technical blocker and it does not block the customer path → do not stop; the operator can trigger the click test on the real phone `+14503285551`.
- Continue observing until Electro Pompe either clicks + registers + pays $1 + activates, OR a real blocker (not a warning) is hit.

## Files expected to change
None this turn. All tracker/UI/edge changes already merged and verified last turn. Publish only.

## Success criteria
- Production is live with the strict-attribution tracker.
- Electro Pompe shown as the sole active run, with the exact expected pending/success states above.
- Live end-to-end reconciliation returned: files changed (none), migrations (none), deployment URL, live test result, remaining REAL blockers.
