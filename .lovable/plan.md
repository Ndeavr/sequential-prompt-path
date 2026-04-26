# UNPRO Copilot Homepage — Mobile-First Premium Rebuild

Transform `/` into a Microsoft Copilot / OpenAI-grade mobile experience: one orb, one question, one recommended pro, one action. Replace the current `Home.tsx` (Hero + 8 sections) with a focused above-fold conversion engine and a tight Alex conversation flow that **never** shows 3 quotes.

---

## 1. New `AlexOrbPremium` Component

**File**: `src/components/alex/AlexOrbPremium.tsx`

Pure CSS/Framer Motion orb — no cartoon face, no heavy assets:

- **Core**: radial gradient blue nucleus (#0A66FF → #3FA9FF → #7ED7FF), inner shine
- **Halo**: soft outer glow with slow breathing (scale 1 → 1.08, opacity 0.4 → 0.9, 3.5s ease)
- **Glass ring**: outer thin border with backdrop-blur, subtle conic gradient
- **Particles**: 6 tiny light dots orbiting at low opacity (CSS only, no canvas)
- **States** (driven by `state` prop):
  - `idle` → breathing pulse only
  - `listening` → halo expands +20%, opacity boosted
  - `speaking` → core intensity +, micro-vibration (rotate ±0.5°)
  - `thinking` → outer ring slow rotation 8s linear
- **Sizes**: `sm | md | lg | xl` (64 / 96 / 144 / 192 px)
- **Below**: `ALEX` label + `Assistant projet maison` subtext (optional via prop)

API: `<AlexOrbPremium state="idle" size="xl" showLabel />`

---

## 2. New Homepage Hero (Above-Fold Mobile-First)

**File**: `src/components/home-copilot/HeroCopilotMobile.tsx`

Single screen on mobile, dark background `#050A12` with subtle blue aurora:

- Top bar: UNPRO logo (left) · burger menu (right)
- Center: `<AlexOrbPremium size="xl" showLabel />`
- Headline: **"Quel est votre projet aujourd'hui?"** (large, bold, last word in `text-primary`)
- Subheadline: *"Alex comprend votre besoin, analyse vos options et recommande le meilleur pro vérifié."*
- Input box (multiline, glass card): placeholder *"Toiture qui fuit, moisissure, rénovation salle de bain..."* with circular send button
- Primary CTA (full-width, gradient): `✨ Parler à Alex` → opens voice via `openAlex("home_voice")`
- Trust line: `🛡 Gratuit • Sans engagement • Réponse rapide`
- Quick chips (horizontal scroll, glass icons): Trouver un pro · Estimer coût · Vérifier pro · Analyser soumission · Téléverser photos · Je suis entrepreneur

Each chip routes to its corresponding flow OR seeds the Alex conversation with a pre-filled intent.

---

## 3. Alex Conversation Flow (Single-Pro Recommendation)

**File**: `src/components/alex-copilot/AlexCopilotConversation.tsx`

Full chat shell triggered when user submits text input or taps a chip. Drop-in mobile sheet:

- Header: back · `<AlexOrbPremium size="sm" />` · "Alex" + "En ligne" green dot · menu
- Messages: alternating bubbles (Alex left grey, user right blue gradient)
- On user message → show `Je comprends. J'analyse votre situation...` + premium loader (1.5s)
- Then render **`CardRecommendedProSingle`** (NOT a 3-pro list):
  - Image / van photo
  - Pro name + `XX% compatibilité` + ⭐ rating + reviews count
  - 5–6 reasons (✅ specialty, recent reviews, sector, availability, price competitive, UNPRO verified)
- Action buttons (stacked, full-width):
  - **Prendre rendez-vous** (primary)
  - **Voir disponibilités**
  - **Pourquoi lui?** → opens `ModalWhyThisPro`
  - **Autre option** → reveals `CardRecommendedProSingle` for 2nd best (still one at a time, max 3 reveals)

**Endpoint wiring**: calls existing `api_unified_matching` / `compute-plan-recommendation` edge functions. Falls back to mock pro for first render.

**Hard rule** enforced in the component: it accepts only a **single** `recommendedPro` prop. Alternative pros are loaded on-demand via `requestAlternative()`.

---

## 4. Modal "Pourquoi lui?"

**File**: `src/components/alex-copilot/ModalWhyThisPro.tsx`

Bottom sheet listing comparative reasons:
- Meilleure expertise spécifique
- Plus rapide disponible
- Plus forte satisfaction clients
- Distance optimale
- Prix généralement compétitif

CTA: `Prendre rendez-vous`.

---

## 5. Booking Sheet

**File**: `src/components/alex-copilot/SheetBookingMobile.tsx`

Mobile bottom sheet with:
- Date picker (next 14 days, visual day chips)
- Time slot chips (morning / afternoon / evening)
- Name · Phone · Adresse projet · Notes (textarea)
- Primary CTA: **Confirmer mon rendez-vous**
- Success state: ✅ `Rendez-vous demandé` + `Le pro confirmera sous peu` + auto-redirect to `/proprietaire/dashboard` after 3s

Wires to existing `bookings` table via `api_unified_booking` (or direct Supabase insert if endpoint not available — to be confirmed in build).

---

## 6. Below-Fold Sections (Light, 3 Blocks Only)

**File**: `src/components/home-copilot/SectionsBelowFold.tsx`

Tight, no clutter:

- **A. Pourquoi UNPRO** — 4 icon cards (Pros vérifiés · IA intelligente · Gain de temps · Moins de stress)
- **B. Avis clients** — horizontal swipe of 4 testimonial cards with avatar + city
- **C. Vous avez déjà des soumissions?** — glass card with stacked-receipts illustration → CTA `Analyser mes soumissions` (routes to `/soumission/analyse`)

Footer: `🛡 Vos informations sont confidentielles.`

---

## 7. Sticky Bottom CTA

**File**: `src/components/home-copilot/StickyBottomAlexCTA.tsx`

Appears after 400px scroll on mobile only:
- Glass blur bar
- Mini orb + `Parler à Alex` button → `openAlex("home_sticky")`

---

## 8. New Page Wrapper

**File**: `src/pages/PageHomeCopilot.tsx`

Replaces `Home.tsx` content via the feature flag wrapper. Structure:

```
<MainLayout transparentHeader darkMode>
  <Helmet>...</Helmet>
  <HeroCopilotMobile />              {/* Above fold */}
  <SectionsBelowFold />              {/* Below */}
  <StickyBottomAlexCTA />
  <AlexCopilotConversation />        {/* Sheet, controlled by store */}
</MainLayout>
```

**Routing**: update `src/components/home-intent/HomeWithFeatureFlag.tsx` to render `PageHomeCopilot` directly (preserves the `/` and `/index` routes).

---

## 9. Conversation State Store

**File**: `src/stores/copilotConversationStore.ts`

Zustand store coordinating the chat sheet:
- `isOpen`, `messages[]`, `recommendedPro`, `alternativesShown`, `bookingOpen`
- Actions: `openConversation(initialText?)`, `sendMessage(text)`, `requestAlternative()`, `openBooking()`, `reset()`
- Used by both the input box CTA and sticky CTA.

---

## 10. Analytics Tracking

**File**: `src/utils/trackCopilotEvent.ts`

Lightweight wrapper writing to `contractor_funnel_events`-style table (reuse existing `trackFunnelEvent` if compatible) for:

- `homepage_loaded`
- `alex_started`
- `message_sent`
- `recommended_pro_shown`
- `booking_started`
- `booking_completed`
- `alternative_option_requested`
- `quote_upload_clicked`

Each event includes `session_id` (sessionStorage UUID) + `metadata`.

---

## 11. Copy Guardrails (Code-Enforced)

Add a build-time lint rule (or comment header in each new file) forbidding the strings `3 soumissions`, `compare 3 pros`, `marketplace`, `directory` inside `src/components/home-copilot/**` and `src/components/alex-copilot/**`. Uses ESLint `no-restricted-syntax` with regex on JSX text.

---

## 12. Design System Tokens

Update `src/index.css` to expose 3 new HSL tokens on the dark background variant (no override of existing tokens):

```
--copilot-bg: 215 70% 5%;        /* #050A12 */
--copilot-blue-1: 220 100% 52%;  /* #0A66FF */
--copilot-blue-2: 207 100% 62%;  /* #3FA9FF */
--copilot-blue-3: 198 100% 75%;  /* #7ED7FF */
```

All new components consume these via Tailwind arbitrary values or `bg-[hsl(var(--copilot-bg))]`. No hardcoded hex.

---

## 13. Files Summary

| Action | File |
|---|---|
| Create | `src/components/alex/AlexOrbPremium.tsx` |
| Create | `src/components/home-copilot/HeroCopilotMobile.tsx` |
| Create | `src/components/home-copilot/SectionsBelowFold.tsx` |
| Create | `src/components/home-copilot/StickyBottomAlexCTA.tsx` |
| Create | `src/components/alex-copilot/AlexCopilotConversation.tsx` |
| Create | `src/components/alex-copilot/CardRecommendedProSingle.tsx` |
| Create | `src/components/alex-copilot/ModalWhyThisPro.tsx` |
| Create | `src/components/alex-copilot/SheetBookingMobile.tsx` |
| Create | `src/stores/copilotConversationStore.ts` |
| Create | `src/utils/trackCopilotEvent.ts` |
| Create | `src/pages/PageHomeCopilot.tsx` |
| Modify | `src/components/home-intent/HomeWithFeatureFlag.tsx` (point to new page) |
| Modify | `src/index.css` (add copilot tokens) |

The legacy `src/pages/Home.tsx` and existing `src/components/home/*` sections remain untouched (still reachable via other routes if needed).

---

## 14. Out of Scope (Phase 2)

- Real-time pro availability graph (uses mock slots first)
- Voice biometrics
- Pro-side notification when booking is created (existing edge function reuse only)

---

## Expected Outcome

- **Mobile screen 1**: orb + headline + input + CTA + chips, all visible without scroll
- **One conversation, one pro, one action** — never a list
- Sticky CTA always 1 tap away
- Premium dark Copilot aesthetic
- Foundation to A/B test against legacy homepage via the existing feature flag wrapper
