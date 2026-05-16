# UNPRO — Production Stabilization Plan

Scope is strictly revenue + Alex stability. No redesign, no unrelated edits. Each task ends with a verification step against the existing codebase before moving on.

---

## Phase 0 — Audit (no edits)

Before touching anything, inventory what already exists so we don't duplicate or break:

- Outbound: `outbound-*` edge functions, `contractor_prospects`, sniper/outbound tables, `/admin/outbound`, `/admin/sniper` (memory: Sniper Outreach Engine, Outbound Autonomous Pipeline, Outbound Operations Hub).
- Landing: `/pro/:slug`, `PageEntrepreneurDiagnosticLanding`, Nuclear Close Landing (memory).
- Stripe: `useCheckoutPricing`, contractor plans config, Native Stripe Payment Element (memory: Checkout Architecture).
- Alex orb/voice: `AlexMorphingOrb`, `AlexCompanionOrb`, `alexVoiceConfig`, `alexAgentOverrides`, `elevenlabsService`, `prepareAlexSpeechText`, `AlexVoiceContext`.

Deliverable: a short internal map of what's already wired vs. what's missing. Build only the gaps.

---

## Task 1 — Outbound contractor agents (gap-fill)

Existing pipeline is largely built. Only fix what's broken:

1. **Status taxonomy alignment**: ensure `contractor_prospects.status` accepts the full list (`queued, enriching, aipp_generated, landing_created, message_ready, approved, sent, clicked, visited, onboarding_started, plan_selected, checkout_started, paid, activated, failed, paused`). Add missing values via migration only if needed.
2. **Admin approval gate**: confirm `/admin/outbound` requires explicit "Approve & Send" click before `send` edge functions run (Outbound Approval Gate memory). Add a confirmation modal if missing.
3. **Pipeline log table**: if `pipeline_logs` (or equivalent) does not already exist, add a minimal append-only log table; otherwise reuse existing audit/event tables.
4. **/admin/outbound cockpit**: verify sections render — Campaign status, Ready, Awaiting approval, Sent today, Clicks, Visits, Onboarding starts, Checkout starts, Paid, Failed, Retry, Pause, Start. Wire only the missing tiles to existing data.

Do NOT rename existing tables (`contractor_prospects`, `outbound_*`, sniper_*). New tables from the spec (`contractor_outreach_campaigns`, etc.) are created only if no existing equivalent is found.

---

## Task 2 — Contractor landing page

`/pro/:slug` exists (Nuclear Close Landing). Verify and patch:

1. Render: business name, detected trade, city, AIPP score + summary, "what we detected", local opportunity, estimated missed revenue.
2. Add (if missing) the 5 goal questions: appointments/month capacity, avg contract value, close rate, priority sector, primary goal (calls / big projects / fill slots).
3. On answer → compute monthly capacity, revenue potential, recommended plan, urgency → show "Plan recommandé" card with CTA "Activer mes rendez-vous".
4. CTA opens the existing inline Stripe Payment Element with the recommended plan + `prospect_id`/`contractor_id` metadata.

No redesign — reuse existing Nuclear Close visual language.

---

## Task 3 — Stripe subscriptions

1. Confirm price catalog: Recrue 0$, Pro 349$, Premium 599$, Élite 999$, Signature 1 799$ (with thin space). Memory locks these.
2. Checkout session must inject `prospect_id` and `recommended_plan` into metadata.
3. Webhook / success handler: on `invoice.paid` / `checkout.session.completed`, mark prospect `paid` → `activated`, activate contractor profile, insert payment event.
4. Success page `/activation/success` with the locked French copy. Create only if it doesn't already exist.

Do not touch Stripe keys, publishable key (`pk_live_Gw47doir5ZX9n9uM0nrBpKro`), or existing checkout architecture.

---

## Task 4 — Alex orb (visual stabilization)

In `AlexMorphingOrb.tsx` and any wrapper still rendering chrome:

1. Root: `background: transparent !important; border: 0 !important; box-shadow: none !important; border-radius: 9999px !important; overflow: visible !important; isolation: isolate;`
2. Remove any ancestor `bg-*`, `border`, `rounded-*`, `backdrop-blur`, `shadow-*`, square aspect wrappers (check `AlexCompanionOrb`, `HeroOrbMockup`, `AlexBottomSheetLauncherUNPRO`, `AlexLauncherHero`).
3. States via CSS-only animations on layered radial gradients:
   - idle → slow breathing
   - listening → subtle pulse
   - thinking → rotating internal gradient
   - speaking → audio-reactive scale (use existing `getOutputVolume`)
   - error → soft amber glow
4. Gestures (existing handler or add minimal): long-press → quick actions sheet; swipe up/down → expand/minimize; swipe left/right → cycle suggestions. Tap → `openAlex()` overlay on current page (never `navigate('/alex')`).

---

## Task 5 — Alex voice (lock + pronunciation)

Already largely done; verify only:

1. `alexVoiceConfig.ts` BASE_TUNING locked: `stability 0.50, similarity_boost 0.75, style 0.35, speaker_boost true, speed 1.0`, model `eleven_multilingual_v2`. Same across modes/turns.
2. Every TTS entry point wraps text with `prepareAlexSpeechText(text, lang)`:
   - `elevenlabsService` REST calls
   - `useVoiceReliability` `alex-tts` call
   - `alexAgentOverrides` `firstMessage`
   - Any inline TTS in `AlexHomepageConversation`, `AlexAssistantSheet`, Nuclear Close
3. Pronunciation map: FR `UNPRO → "Un Pro"`, `d'UNPRO → "d'Un Pro"`, `de UNPRO → "d'Un Pro"`; EN `UNPRO → "Hun Pro"`. Never expose this string to UI.
4. No client overrides on `startSession` beyond `voiceId` + `firstMessage` (already enforced in `alexAgentOverrides`).

---

## Task 6 — Validation (manual + scripted)

Run end-to-end on staging:

1. Approve campaign in `/admin/outbound` → confirm `sent` row appears in pipeline log only after confirmation.
2. Open generated landing URL → verify business name, AIPP score, no `mock|demo|placeholder|test` strings visible (grep public components).
3. Answer goals → recommended plan card appears.
4. Click CTA → Stripe Payment Element opens with correct plan + metadata.
5. Complete test payment → prospect status `paid → activated`, `/activation/success` renders.
6. Open Alex orb on `/index`, `/pro/:slug`, `/admin` → no square, overlay stays on page.
7. Trigger Alex greeting → audio says "Un Pro", never "U-N-P-R-O".

Add a small Vitest covering `prepareAlexSpeechText` edge cases (already exists — extend if gaps).

---

## Task 7 — Do-not-break protection

- All edits scoped to: orb components, voice config/service, outbound admin gap-fills, landing page goal form, Stripe metadata + success page.
- Untouched: auth, AIPP edge functions, existing landing pages outside `/pro/:slug`, contractor onboarding post-payment, outbound scraping/enrichment edge logic, Supabase RLS unless a new column/table requires it.
- Migrations: additive only. No renames, no drops.
- After edits: typecheck + targeted preview test on `/index`, `/pro/:slug`, `/admin/outbound`, `/activation/success`.

---

## Technical notes

- New tables (only if missing): use `gen_random_uuid()`, `created_at/updated_at` triggers, RLS enabled, admin-only policies via `has_role`.
- Edge functions: keep `https://esm.sh/@supabase/supabase-js@2.49.1` per project constraint.
- Stripe metadata keys: `prospect_id`, `contractor_id`, `recommended_plan`, `source=outbound`.
- All public-facing strings in fr-CA with thin-space currency formatting (existing `formatPrice` util).

---

## Out of scope (explicit)

- No new homepage, no redesign of existing landings, no new admin sections beyond `/admin/outbound` gap-fills, no auth changes, no schema renames, no new AI features.
