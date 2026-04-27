
# Alex Entrepreneur Onboarding — Closer Mode (no more contact form)

## Diagnosis

Three concrete leak points, all confirmed in code:

1. **`src/services/alexCopilotEngine.ts`** — the deterministic engine that drives Alex on the homepage chat — has **NO contractor branch**. Intents are limited to `paint | humidity | roof | verify | quote_compare | photo | unknown`. When an entrepreneur says "je suis entrepreneur" or "je veux des contrats", it falls into `nextGenericQuestion` → unknown chips → eventually a generic "ajouter une photo / trouver un pro" summary. That's why Alex acts like a homeowner receptionist.

2. **`src/pages/pricing/ContractorPlans.tsx:363`** — does `navigate(\`/contact?subject=${planCode}\`)` for several plan tiers. Pure conversion leak.

3. **`src/pages/PageHomeIntentUNPRO.tsx`** and **`src/services/alexConfig.ts`/`alexStateMachine.ts`/`alexResponsePolicyEngine.ts`** already forbid the phrase "on vous rappelle" — but only at the LLM-prompt layer. The deterministic engine bypasses those guards because it has no contractor flow at all.

A `contractor_onboarding` branch already partially exists (`alexEntrepreneurGuidanceEngine.ts` + 30+ supabase tables + `aipp-real-scan`, `enrich-business-profile`, `activate-contractor-plan` edge functions). Nothing wires it into the chat.

## Build

### 1. Extend the chat engine with a contractor branch

**Edit `src/services/alexCopilotEngine.ts`**:

- Add intent `"contractor"` to `AlexIntent`.
- Add new quick-reply actions:
  - `{ kind: "start_contractor_onboarding" }`
  - `{ kind: "checkout_plan"; planCode: "recrue" | "pro" | "premium" | "elite" | "signature" }`
  - `{ kind: "show_all_plans" }`
- Add `CONTRACTOR_HINTS` mirroring `ENTREPRENEUR_SIGNALS` from `alexEntrepreneurGuidanceEngine.ts` plus: "offrir mes services", "recevoir des clients", "avoir des contrats", "m'inscrire comme pro", "faire partie de unpro", "plan entrepreneur", "combien ça coûte pour les pros", "je suis contracteur", "je suis pro".
- Promote `detectIntent` so contractor signals beat homeowner intents.
- Add `AlexSession` fields: `mode: "homeowner" | "contractor_onboarding"`, `contractorStage: "intent_detected" | "identity_collected" | "profile_started" | "enrichment_running" | "aipp_scored" | "objectives_collected" | "plan_recommended" | "checkout_started" | "activated"`, `contractorIdentity?: { businessName?, phone?, website?, rbq?, neq? }`, `aippPreview?: { score: number; topGap: string }`, `objective?: string`, `recommendedPlan?: PlanTier`.
- Add `nextContractorDecision(session, userText)`:
  - **Stage `intent_detected`** → message: *"Parfait. On démarre votre fiche UNPRO maintenant. Donnez-moi le nom de votre entreprise, votre site web, votre téléphone ou votre numéro RBQ — je prépare votre score AIPP."* Quick replies: `J'ai un site web` / `J'ai un RBQ` / `J'ai seulement mon téléphone` / `Voir les plans`.
  - **Stage `identity_collected`** (any one identifier extracted) → message: *"Merci. Je démarre votre fiche entrepreneur maintenant. Je vais analyser votre présence et calculer votre score AIPP."* Sets stage to `enrichment_running`, returns `nextBestAction: "run_contractor_enrichment"`.
  - **Stage `aipp_scored`** → render the score sentence + objective question with chips: `Recevoir plus de rendez-vous` / `Remplir mon calendrier` / `Mieux classé dans UNPRO` / `Améliorer mon profil` / `Protéger mon territoire` / `Comprendre les plans`.
  - **Stage `objectives_collected`** → call `recommendPlanFromObjective(objective)` (new helper that maps objective → `PlanTier` using the existing `recommendPlanFromRdv` logic as fallback). Render: *"Pour [objectif], je recommande le plan [Plan] à [prix]$/mois."* Quick replies: `Activer [Plan]` (action `checkout_plan`) / `Voir tous les plans` / `Continuer ma fiche` / `Parler à Alex`.
- Add identifier extractors: `extractPhone`, `extractWebsite`, `extractRbq` (regex `\b\d{4,5}-\d{4}-\d{2}\b`), `extractNeq` (10 digits), `extractBusinessName` (fallback to first capitalized phrase).
- Add `forbiddenPhrases` guard exported as `assertNoCallback(text)` that throws in dev if any reply contains `/rappel|callback|on vous rappel|formulaire de contact/i` — safety net.

### 2. Wire the conversation store

**Edit `src/stores/copilotConversationStore.ts`**:

- Init `session.mode = "homeowner"` and `contractorStage` undefined.
- In `sendMessage`, after `decideNext`, branch on `decision.nextBestAction`:
  - `"run_contractor_enrichment"` → call new `runContractorEnrichment(session.contractorIdentity)` from `src/services/alexContractorOnboardingService.ts` (new). It invokes the existing `enrich-business-profile` edge function and `aipp-real-scan` in parallel, then patches the session with `aippPreview` and emits a follow-up Alex bubble: the AIPP score sentence + objective chips. Show a transient "Je prépare votre fiche professionnelle et votre score AIPP…" bubble while running.
  - `"checkout_plan"` → invoke a new edge function `create-contractor-checkout` (Stripe `mode: "subscription"` for monthly plans, `mode: "payment"` for founder lifetime tiers). Open returned URL in a new tab. Update stage to `checkout_started`.
- New `executeQuickReply` handlers for `start_contractor_onboarding`, `show_all_plans`, `checkout_plan`.

### 3. New service `src/services/alexContractorOnboardingService.ts`

- `startContractorOnboardingSession(input)` — sets mode, upserts a draft `contractor_profile` row (only if logged in; otherwise stash in session), kicks off enrichment + AIPP, returns next message.
- `runContractorEnrichment({ businessName, phone, website, rbq, neq })` — invokes `enrich-business-profile` then `aipp-real-scan` (or `aipp-v2-analyze`) and normalizes the response to `{ score: 0-100, topGap: string }`.
- `recommendPlanFromObjective(objective: string): PlanTier` — deterministic mapping:
  - "rendez-vous" / "calendrier" → `pro`
  - "classé" / "visibilité" → `premium`
  - "profil" / "améliorer" → `recrue`
  - "territoire" / "protéger" → `signature`
  - "comprendre" → triggers `show_all_plans` quick reply path
- `getCheckoutUrl(planCode)` — wraps `supabase.functions.invoke("create-contractor-checkout", { body: { plan_code } })`.

### 4. New edge function `supabase/functions/create-contractor-checkout/index.ts`

- Plans (source of truth, hard-coded):
  - `recrue`: $149/mo (recurring)
  - `pro`: $349/mo (recurring)
  - `premium`: $599/mo (recurring)
  - `elite`: $999/mo (recurring)
  - `signature`: $1799/mo (recurring)
  - `founder_elite_10y`: $19,995 one-time
  - `founder_signature_10y`: $29,995 one-time
- Reads existing Stripe price ids from `plan_catalog` table (per `mem://pricing/contractor-plans-dynamic`); falls back to creating a price on the fly only if missing.
- Handles guest users (no auth header) by passing `customer_email` later — for now, return a sign-in prompt URL for unauthenticated requests so the chat can route to auth then resume.
- `success_url` → `/entrepreneur/onboarding?step=post_payment&plan={code}`. `cancel_url` → `/?alex=resume`.
- Standard `corsHeaders`, `apiVersion: "2025-08-27.basil"`, esm.sh import.

### 5. Replace the contact-form leak in `ContractorPlans.tsx`

- Remove `navigate(\`/contact?subject=${planCode}\`)` at line 363.
- Replace with: open the Alex copilot via `useCopilotConversationStore.getState().open()` and synthesize a contractor message *"Je veux activer le plan {planLabel}."* — Alex will route to `contractor_onboarding` and trigger checkout in-chat.

### 6. UI: add visible "Je suis un entrepreneur" entry chip

**Edit `src/components/alex-copilot/AlexCopilotConversation.tsx`** (or the dock that opens the sheet):

- When the chat is empty (greeting bubble), render a top row of role chips: `Propriétaire` / `Entrepreneur` / `Gestionnaire de condo`. Tapping `Entrepreneur` calls `executeQuickReply({ kind: "start_contractor_onboarding" })`.

### 7. Sanitizer hardening

**Edit `src/utils/sanitizeAlexText.ts`**:

- Add a regex that strips/replaces any phrase matching `/(on|nous|quelqu'un|un agent|un conseiller)\s+(va|vont|vous)\s+(rappel|recontacter|contacter)/i` and replace with the canonical contractor opener.
- Add stripping for `open_contact_form`, `openContactForm`, `/contact?` if it ever leaks through.

### 8. Memory + analytics

- Append to `mem://ai/alex/brain-orchestration`: contractor branch routing rule + forbidden callback phrases.
- Add new `CopilotEventName`s in `src/utils/trackCopilotEvent.ts`:
  - `contractor_intent_detected`, `contractor_identity_collected`, `contractor_enrichment_started`, `contractor_aipp_scored`, `contractor_plan_recommended`, `contractor_checkout_started`, `contractor_checkout_completed`.

### 9. Acceptance tests (manual)

1. Send "je suis entrepreneur" → Alex replies with the canonical opener and identity chips. **No** `/contact` redirect, **no** "on vous rappelle".
2. Send "mon site est exemple.ca" → Alex acknowledges, shows "Je prépare votre fiche…" then renders an AIPP score (mocked if edge function offline) + objective chips.
3. Tap "Recevoir plus de rendez-vous" → Alex recommends Pro $349 + `Activer Pro` button.
4. Tap `Activer Pro` → Stripe checkout opens in new tab. Cancel → returns to chat at the plan_recommended stage.
5. From `/entrepreneur/plans`, click any plan tier currently routing to `/contact` → opens Alex chat in contractor mode at plan_recommended for that tier.
6. Try to type "je vais vous rappeler" as Alex (dev guard) → throws in dev, sanitized in prod.

## Files touched

**Create**
- `src/services/alexContractorOnboardingService.ts`
- `supabase/functions/create-contractor-checkout/index.ts`

**Edit**
- `src/services/alexCopilotEngine.ts`
- `src/stores/copilotConversationStore.ts`
- `src/components/alex-copilot/AlexCopilotConversation.tsx`
- `src/components/alex-copilot/ChatQuickReplies.tsx` (only if new action kinds need styling)
- `src/pages/pricing/ContractorPlans.tsx`
- `src/utils/sanitizeAlexText.ts`
- `src/utils/trackCopilotEvent.ts`
- `.lovable/memory/index.md` + `mem://ai/alex/brain-orchestration`

**Migrations**
- None required (all tables exist: `contractor_profiles`, `contractor_aipp_scores`, `entrepreneur_goals`, `entrepreneur_plan_recommendations`, `plan_catalog`).

## Out of scope (next prompt)

- Founder availability gating before checkout (already covered by `mem://features/founder-availability-checker` — call it from `create-contractor-checkout` for `founder_*` codes only).
- Post-payment onboarding wizard (calendar sync, zones, specialties) — exists at `/entrepreneur/onboarding-voice`, just point success_url at it.
