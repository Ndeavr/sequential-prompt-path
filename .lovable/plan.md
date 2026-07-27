## Objective
Verify and finalize the strict-attribution First Dollar Tracker so it anchors on Electro Pompe only and never surfaces historical clicks/activations. Publish only after verification.

## Current state (verified last turn)
- `v_first_dollar_tracker` redefined: anchors on the most recent active prospect with a real Twilio SID (Electro Pompe, prospect `aa4ebd75…`, lead `dd9f83bb…`, phone `+14503285551`, SID `SM7770bec70bfd1ea15d88ef8b13a3888b`), and links each downstream milestone via prospect_id / lead_id / tracking token / provider_message_id / phone — no MIN() over history, no date-only attribution.
- `contractor-revenue-timeline` edge function returns `conversion_next_action` and `technical_next_action` separately (deployed).
- `RevenueTimelinePanel.tsx` and `FirstDollarMini` in `PageAdminAcquisitionPipeline.tsx` consume the new fields.
- Latest read of the view confirms: `next_missing_milestone = First Click`, `telemetry_warning = delivery_callback_missing`, historical click correctly ignored.

## Remaining work

### 1. Full audit for any residual MIN()/date-only attribution
- Grep `src/hooks/useAcquisitionFunnel.ts`, `src/hooks/useFirstDollarFunnel.ts`, `src/features/systemIntegrity/First1DollarTracker.tsx`, `src/components/admin/outreach/FirstRevenueTracker.tsx`, and any other tracker/funnel reader for `min(`, `MIN(`, or timestamp-only fallbacks.
- Confirm no consumer of the tracker falls back to `contractor_funnel_events`, `launch_leads`, or `sms_events_v2` counts when the linked-milestone value is null. Any such fallback must be removed for the active-run panel (period cards used elsewhere can keep their own counts, out of scope).

### 2. Verify the exact required copy is rendered
- `FirstDollarMini` (and `RevenueTimelinePanel` for Electro Pompe) must show:
  - FIRST SMS SENT → success, real timestamp, masked SID.
  - DELIVERY → pending (telemetry warning `delivery_callback_missing`).
  - CLICK / REGISTRATION / OTP / CHECKOUT / PAYMENT / ACTIVATION → pending (attribution manquante where no linkage).
  - `conversion_next_action` = "Clic sur le lien d'activation".
  - `technical_next_action` = "Réparer StatusCallback Twilio".
- Adjust the edge function's French mapping if the current wording differs.

### 3. Runtime verification before publish
- Re-query `v_first_dollar_tracker` and `contractor-revenue-timeline?prospect_id=aa4ebd75…`; confirm no historical click or activation is marked complete.
- Load `/admin/acquisition-pipeline` via Playwright at 390 / 984 / 1280 widths; screenshot the First Dollar block and the Revenue Timeline panel; confirm the two-action bandeau shows the exact required strings and no green historical stages.

### 4. Publish
- Only after step 3 passes on all three widths, publish the front-end. If any historical click/activation still appears, stop and repair before publishing.

## Files expected to change
- Possibly `supabase/functions/contractor-revenue-timeline/index.ts` (copy tweak only, if wording drift).
- Possibly `src/pages/admin/PageAdminAcquisitionPipeline.tsx` or `src/components/admin/acquisition/RevenueTimelinePanel.tsx` (copy/fallback tightening).
- No DB migration expected — the view already enforces strict attribution.

## Out of scope
SEO, sitemaps, AI corpus, outreach send logic, role switcher, affiliate flow, other funnel period views.

## Success criteria
- Tracker shows Electro Pompe as the sole active run.
- No stage marked complete without an explicit linkage to prospect/lead/token/SID/phone.
- Exact French `conversion_next_action` and `technical_next_action` strings render.
- Verified at 390 / 984 / 1280 before publish.
