

# Friction Elimination System — Global UX Sanity Patch

## Overview
Apply 27 friction elimination rules across all UNPRO flows by creating a centralized friction detection/rescue system, adding sticky mobile CTAs, autosave, smart defaults, hesitation rescue, and human-friendly error handling platform-wide.

---

## Phase 1 — Hesitation Rescue Engine

**New file: `src/hooks/useHesitationRescue.ts`**

Detects user idle time on any screen and surfaces a contextual help nudge after 8 seconds of inactivity.

- Tracks last interaction timestamp (click, scroll, keypress, touch)
- After 8s idle: shows a dismissible toast/banner with contextual message
- Messages are screen-aware (e.g. on checklist: "Alex peut compléter ça pour vous", on payment: "Des questions sur les plans?")
- Connects to existing `alexFrictionEngine.ts` by emitting `createFrictionSignal("inactivity_30s")` etc.
- Max 2 nudges per screen session, then goes passive (aligns with `alexReEngagementControl`)

## Phase 2 — Sticky Mobile CTA Component

**New file: `src/components/ui/StickyMobileCTA.tsx`**

Reusable sticky bottom CTA bar for all funnel screens on mobile:

- Fixed bottom, backdrop blur, safe-area padding
- Single primary button (label + icon customizable)
- Optional secondary ghost action
- Used on: ScreenScore, ScreenChecklist, ScreenCalendar, ScreenPlan, ScreenPayment

**Modifications to activation screens:**
- `ScreenScore.tsx`: Wrap CTA in StickyMobileCTA
- `ScreenChecklist.tsx`: Move "Continuer" to sticky bottom
- `ScreenCalendar.tsx`: Move CTAs to sticky bottom
- `ScreenPlan.tsx`: Move "Activer ce plan" to sticky bottom
- `ScreenPayment.tsx`: Move "Payer" to sticky bottom

## Phase 3 — Autosave System

**Modify: `src/hooks/useActivationFunnel.ts`**

Add debounced autosave (1.5s after last change):
- Every `updateFunnel` call queues a debounced DB write
- Visual indicator: tiny "Sauvegardé ✓" text near progress bar
- On page return/refresh: resume exactly where left off (already partially implemented, needs current_screen routing)

**Modify: `ScreenChecklist.tsx`**
- Add "Sauvegarde automatique" indicator
- Save each section independently on change (not just on continue)

## Phase 4 — Smart Defaults

**Modify: `ScreenCalendar.tsx`**
- Pre-select Mon-Fri and 8h-17h (already done — confirm)
- Default "Passer pour l'instant" is visible (already done)

**Modify: `ScreenPlan.tsx`**
- Pre-select "yearly" billing (already done)
- Pre-select "premium" plan (already done)
- Add "Pourquoi Premium?" expandable explanation: territory demand, services count, calendar enabled

**Modify: `ScreenChecklist.tsx`**
- Pre-select Quebec region for zones
- Pre-select French language in preferences
- Auto-suggest top 3 most common services based on imported data

## Phase 5 — Human-Friendly Error Messages

**New file: `src/utils/friendlyErrors.ts`**

Maps technical errors to fr-CA human messages:
- `"Edge function returned 500"` → `"Service temporairement indisponible. Réessayez."`
- `"No such price"` → `"Plan introuvable. Contactez-nous."`
- `"Invalid payload"` → `"Données incorrectes. Vérifiez vos informations."`
- `"IDLE_TIMEOUT"` → `"La connexion a expiré. Réessayez."`
- Network errors → `"Connexion internet instable. Vérifiez votre réseau."`

**Modify: All screens with `catch` blocks** (ScreenAccount, ScreenPayment, ScreenImport)
- Replace raw `err.message` with `friendlyError(err)`
- Never show technical strings to users

## Phase 6 — Progress & Momentum Indicators

**Modify: `FunnelLayout` or create wrapper**

Add a persistent top progress bar across all activation screens:
- Shows step X of 9
- Shows estimated time remaining (e.g. "~4 min restantes")
- Shows completion percentage

**Modify: `ScreenChecklist.tsx`**
- Add total estimated time: "~12 min pour compléter"
- Show per-section "X min" badges (already done)
- Add overall completion bar at top

## Phase 7 — Micro-Commitment Reinforcement

**Modify: `ScreenScore.tsx`**
- After score reveal, add trust reinforcement section before CTA:
  - "Vos données sont sécurisées"
  - "Annulez en tout temps"
  - "Support disponible"

**Modify: `ScreenPayment.tsx`**
- Before pay button, show:
  - Price with taxes breakdown
  - What happens after payment
  - "Annulez en tout temps" reassurance (already partially done)

## Phase 8 — No Dead Ends

**New file: `src/components/ui/EmptyStateFallback.tsx`**

Reusable component for when no results/data:
- Never shows "nothing found"
- Always offers: "Ajouter manuellement", "Parler à Alex", "Réessayer"

**Modify: `ScreenImport.tsx`**
- If enrichment fails or returns empty: show fallback with manual entry option instead of blank
- Never leave user on a dead import screen

**Modify: `ScreenChecklist.tsx`**
- If no auto-detected services: show "Ajoutez vos services" prompt instead of empty chips

## Phase 9 — Instant Feedback

**Global CSS addition in `index.css`:**
```css
button:active, [role="button"]:active {
  transform: scale(0.97);
  transition: transform 50ms;
}
```

- All buttons get instant press feedback via CSS active state
- Loading states already use `Loader2` spinner (confirmed across screens)

## Phase 10 — Social Proof at Decision Points

**Modify: `ScreenPlan.tsx`**
- Add near plan cards: "Choisi par 68% des entrepreneurs du Québec" on Premium
- Add: "147 profils activés ce mois"

**Modify: `ScreenPayment.tsx`**
- Add: "Paiement sécurisé par Stripe" with lock icon (already present)
- Add: "Entrepreneurs actifs au Québec: 200+"

---

## Files to create/modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/hooks/useHesitationRescue.ts` | Idle detection + contextual rescue nudges |
| Create | `src/components/ui/StickyMobileCTA.tsx` | Reusable sticky bottom CTA |
| Create | `src/utils/friendlyErrors.ts` | Human-friendly error message mapper |
| Create | `src/components/ui/EmptyStateFallback.tsx` | No dead-end fallback component |
| Modify | `src/hooks/useActivationFunnel.ts` | Debounced autosave + resume routing |
| Modify | `src/pages/entrepreneur/activation/ScreenScore.tsx` | Sticky CTA + trust signals |
| Modify | `src/pages/entrepreneur/activation/ScreenChecklist.tsx` | Sticky CTA + autosave indicator + smart defaults |
| Modify | `src/pages/entrepreneur/activation/ScreenCalendar.tsx` | Sticky CTA |
| Modify | `src/pages/entrepreneur/activation/ScreenPlan.tsx` | Sticky CTA + social proof + "why recommended" |
| Modify | `src/pages/entrepreneur/activation/ScreenPayment.tsx` | Sticky CTA + tax breakdown + friendly errors |
| Modify | `src/pages/entrepreneur/activation/ScreenImport.tsx` | Dead-end fallback on failure |
| Modify | `src/pages/entrepreneur/activation/ScreenAccount.tsx` | Friendly errors |
| Modify | `src/index.css` | Global button active press feedback |

## Expected outcome
- 8-second hesitation rescue across all funnel screens
- Sticky mobile CTAs on every decision screen
- Autosave on every field change with visual confirmation
- Smart defaults pre-selected (Quebec, French, yearly, Premium)
- Zero technical error messages shown to users
- No dead-end screens — always an escape path
- Social proof at decision points (plan selection, payment)
- Instant tap feedback on all buttons
- Progress momentum indicators showing time remaining

