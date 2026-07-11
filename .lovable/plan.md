## Objective

Remove the manual "Planifier un échange avec l'équipe UNPRO" evaluation-request form from public contractor profiles (starting with ISR) and replace it with a **direct instant booking** panel using real contractor calendar availability. Recommendation → booked appointment in under 30 s, no UNPRO callback in the loop.

## Scope

Public contractor profile page for ISR:
`src/pages/entrepreneur/PageContractorPublicProfileISR.tsx`

Backing infrastructure already exists (reuse, do not rebuild):
- `appointment_slots` table (status `available` / `held` / `booked`, public SELECT policy)
- `appointments` table (RLS by homeowner)
- `WidgetInstantBookingSlots` + `useBookingSlots` hook (`src/hooks/useIntentFunnel`)
- `ModalProfileCompletionGate` for phone/address gate
- `PageBookingInstant` — reference for the auth+profile flow

## Changes

### 1. Remove
In `PageContractorPublicProfileISR.tsx`:
- Delete the entire `EvaluationBookingPanel` component (lines ~297–429), plus `SUPABASE_URL` / `ANON_KEY` / `inputCls` / `Field` helpers only used by it.
- Delete the `<section id="evaluation">` block that renders `<EvaluationBookingPanel />` (lines ~231–233).
- Remove the "L'équipe UNPRO vous contacte sous 24 h…" success copy and the entire manual-request form (name, courriel, téléphone, moment préféré dropdown, précisions textarea, "Confirmer la demande d'évaluation" button).

### 2. Replace with `DirectBookingPanel`
New inline component in the same file, mounted at `#evaluation`:

- **Heading (ISR):** `Planifiez directement votre évaluation gratuite`
- **Subheading (ISR):** `Choisissez un créneau disponible avec Isolation Solution Royal.`
- **Slots grid:** reuse `useBookingSlots(contractorId)` to fetch real `appointment_slots` where `status='available'` and `starts_at > now()`. Render with `WidgetInstantBookingSlots` (already handles empty/loading states).
- **Selection flow (mirrors `PageBookingInstant`):**
  1. Guest → open `AuthGate` (existing) → require sign-in.
  2. Signed-in but incomplete profile (missing phone/address in `user_profiles_extended`) → `ModalProfileCompletionGate`.
  3. Complete → `bookSlot(contractorId, slotId, userId)` → inserts into `appointments` (status `scheduled`), sets slot to `booked`. Existing hook already does this.
- **Success state:** inline card "Rendez-vous confirmé" + scheduled date/time + short explainer that ISR will call to confirm details. No "équipe UNPRO", no callback promise.
- **Empty slots fallback:** show "Aucun créneau disponible cette semaine" + phone CTA `514-249-9522`.

### 3. Update the hero CTA (line 128)
Keep the amber button but change the label to `Réserver mon évaluation gratuite` and keep `href="#evaluation"`.

### 4. Delete stale hook usage
Remove imports and state tied only to the old panel (`useState`, `useMemo`, phone formatter usage inside the deleted component). Keep the top-of-file `formatPhoneDisplay` only if still referenced elsewhere.

### 5. Homeowner Alex handoff (already wired)
Alex recommendation → the recommended contractor's public profile with anchor `#evaluation`. Existing `alexAnswerBuilder` / `PageBookingInstant` continue to work; no change needed here beyond ensuring Alex's "Book" suggestion links to `/entrepreneur/:slug#evaluation`.

## Out of scope

- Non-ISR contractor pages (this page is ISR-specific; generic contractor pages already use `PageBookingInstant` / `WidgetInstantBookingSlots`).
- Seeding real ISR slots — this plan wires the UI to `appointment_slots`; slot creation is done via the existing contractor booking admin.
- The `book-contractor-evaluation` edge function stays deployed (used by other legacy surfaces); we simply stop calling it from ISR.

## Success

- No form fields, no "moment préféré" dropdown, no "équipe UNPRO" copy on the ISR public page.
- Visiting `#evaluation` shows real available slots pulled live from `appointment_slots`.
- One tap → auth/profile gate (if needed) → confirmed appointment row in `appointments` with `slot_id` set and slot flipped to `booked`.
- Total interactions from slot click to confirmation ≤ 3 (auth, profile completion, confirm).
