# Search "Solution Isolation" → instant results, from page 1

## Problem

Today on `/verifier-entrepreneur` the hero has a single text input "Nom, téléphone, RBQ ou site web" with a **Vérifier** button. Typing "Solution Isolation" and pressing Vérifier just navigates to `/verifier-un-entrepreneur?q=...`, which shows a 5-field form. If the user clicks Vérifier again with only that one field, the backend can't disambiguate → "Aucune entreprise n'a pu être reliée — 0/100".

The user expects: from the first page, typing a business name surfaces matching companies (Google Places), the user picks one (or it auto-picks if there's a single strong match), and verification runs immediately on rich data (name + phone + address + website + place_id).

The required backend already exists: edge function `business-lookup` + the `BusinessNameSearch` autocomplete component (used inside the inner page only).

## Goal

The first page must be enough to find and verify a company. No second form, no clarifying questions.

## Changes

### 1. `src/pages/VerifyLandingPage.tsx` — Hero search becomes a real autocomplete

- Replace the plain `<Input>` + `<Button>Vérifier</Button>` block with a new component `HeroBusinessVerifySearch` that:
  - As the user types (≥3 chars, debounced 300ms), calls `supabase.functions.invoke("business-lookup", { body: { query } })` (same call BusinessNameSearch already uses).
  - Renders a results dropdown directly under the input: business name, city, rating, category, small "Vérifier" affordance per row. Use the existing UI tokens (glass card, `bg-card`, `text-foreground`, etc.) — no hard-coded colors.
  - Keyboard support: ↑/↓ to highlight, Enter to pick the highlighted row (or top row if none highlighted), Esc to close.
- Behavior when user presses the **Vérifier** button or hits Enter on the input:
  - If results contain exactly 1 candidate, pick it.
  - If results contain 2+ candidates, keep the dropdown open and focus the first row (do NOT navigate yet — let user choose). No modal, no extra question.
  - If results are empty, navigate to the inner page in "manual" mode with the raw query (current behavior) so the user can still proceed.
- On candidate pick: navigate to `/verifier-un-entrepreneur` with the full payload passed via `location.state` (`{ prefill: { business_name, phone, website, city, place_id }, autoRun: true }`) plus a fallback `?q=` for shareable URLs.

### 2. `src/pages/VerifierEntrepreneurPage.tsx` — Accept prefill + auto-run

- On mount, read `useLocation().state` and `useSearchParams()`:
  - If `state.prefill` is present, hydrate `form` with all provided fields.
  - If `state.autoRun === true` OR (≥2 strong identifiers among name/phone/website/rbq), call `handleVerify()` automatically once (guarded by a ref so it never loops).
  - If only `?q=` is present (no prefill), put the value in the strongest-looking field (name by default) and stay idle — user can still hit Vérifier.
- Do not change the existing 5-field form, the loading animation, or the results layout. The page just stops being a dead-end when arriving from the hero.

### 3. No backend changes

- `business-lookup` already returns name, phone, website, city, place_id, etc. — enough to drive the existing `verify-contractor` edge function with multiple strong identifiers, which is what produces a real score instead of 0/100.
- No DB migration. No new edge function. No new dependency.

## Out of scope

- Tweaking the verification scoring engine itself.
- Adding "create a missing company" flow (the user explicitly said "do not ask").
- Redesigning the results page.

## Acceptance

- On `/verifier-entrepreneur`, typing "Solution Isolation" shows a dropdown of real matches within ~1s.
- Clicking a match (or pressing Enter when only one match exists) takes the user straight to the loading animation, then to a populated results page with a non-zero score when public data exists.
- If multiple matches exist, the user picks one in the dropdown — no second form, no extra question.
