# Simplified UNPRO Home Page (Alex-First)

Replace the current `/` and `/index` homepage (`PageHomeCopilot` with hero + sections + sticky CTA + floating Alex bubble) with a clean, mobile-first single-column layout where Alex is embedded **inline** in the page.

The current `PageHomeCopilot.tsx` will be **kept** (renamed/preserved) for future reuse, and a new simpler page will replace it.

## Final layout (top to bottom)

```text
┌─────────────────────────────────────┐
│  Header (logo, city, hamburger)     │  ← existing SmartHeader
├─────────────────────────────────────┤
│  Hero title (h1, deep navy)         │
│  "Décrivez votre problème ou        │
│   imaginez votre projet"            │
│  Sub: "Alex vous aide à estimer…"   │
├─────────────────────────────────────┤
│         🟦  LARGE ALEX ORB          │  ← centered, pulsating (glow)
│        ● Alex · Votre expert IA     │
│       🎤 Cliquez pour parler        │
├─────────────────────────────────────┤
│  Glass card — Alex greeting bubble  │
│  "Bonjour ! Je suis Alex…"          │
├─────────────────────────────────────┤
│  Glass card — Chat input            │
│  ┌─────────────────────────────┐    │
│  │ Écrivez votre message…  ➤  │    │
│  │ 📎 Téléverser une photo…   │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  "Que souhaitez-vous faire ?"       │
│  [Analyser] [Estimer] [Comparer]    │  ← 8 intent chips, 2 cols on mobile
│  [Vérifier] [Trouver] [Photo]       │
│  [Entrepreneur] [Je ne sais pas]    │
├─────────────────────────────────────┤
│  Two trust cards (1 col mobile):    │
│  • Pour les propriétaires           │
│  • Pour les entrepreneurs           │
├─────────────────────────────────────┤
│  Trust footer strip (4 mini-icons)  │
└─────────────────────────────────────┘
```

## Behavior

- **Orb tap** → starts voice mode (calls existing `useAlexVoice().unlockAudio` + voice session).
- **Typing in chat input + send** → starts text mode (routes via existing `useAlexUIBridge.onTextSubmit`).
- **Upload button** → triggers existing `AlexUploadDropzone` file picker.
- **Intent chip tap** → dispatches a pre-filled message to Alex (e.g. "Je veux analyser un problème"); the chip `Je suis entrepreneur` routes immediately to `/join` (contractor onboarding); `Téléverser une photo` opens the file picker.
- Chat stays embedded on the page (no floating bubble, no popup).
- Above the mobile keyboard: input uses `position: sticky` only when scrolled past, and `visualViewport` listener keeps it visible (already exists in the conversational homepage helpers — reuse).
- One question at a time — preserved by existing Alex brain logic.
- The current floating `AlexAssistant` bottom-right widget is **disabled on this homepage only** to avoid duplicates.

## Files

**Created**
- `src/pages/PageHomeSimple.tsx` — new simple home; wraps `MainLayout` + `AlexProvider`.
- `src/components/home-simple/HeroAlexCentered.tsx` — title, subtext, large orb, status pill.
- `src/components/home-simple/AlexEmbeddedChat.tsx` — greeting bubble + input card + upload, wired to existing `useAlexUIBridge`.
- `src/components/home-simple/IntentChipsGrid.tsx` — 8 chips, 2-col mobile / 4-col desktop, with router dispatch.
- `src/components/home-simple/TrustPromiseCards.tsx` — two glass cards (homeowners / contractors) with the exact promise copy.
- `src/components/home-simple/TrustFooterStrip.tsx` — 4 reassurance items.

**Edited**
- `src/components/home-intent/HomeWithFeatureFlag.tsx` — return `<PageHomeSimple />` instead of `<PageHomeCopilot />`.
- `src/features/alex/AlexAssistant.tsx` — accept optional `hideFloatingPanel` prop OR add a route check (`location.pathname === "/"`) to suppress the floating widget on the new home (avoids duplicate Alex UI).

**Kept untouched (for future reuse)**
- `src/pages/PageHomeCopilot.tsx` and all `home-copilot/` components — still importable, just no longer mounted at `/`.

## Design tokens (reuse existing)

- Background: white `#FFFFFF` with subtle inspirational hero image bleed (use existing hero asset if available, else clean white).
- Primary text: deep navy via existing `--foreground` token on the warm landing theme.
- Accent: UNPRO blue (`--primary`).
- Cards: `bg-white/70 backdrop-blur-xl border border-border/40 rounded-3xl shadow-[var(--shadow-soft)]` — glassmorphism, 24px corners.
- Orb: reuse `<AlexOrb size="lg">` and wrap in extra glow rings (scale ~1.6× via container) so it matches the mockup hero size.
- Typography: `text-hero` / `text-hero-sm` for the title, `text-body-lg` for subtext.
- Apply `landing-warm` theme class on the page root (per memory: public pages use warm neutral / white).

## Out of scope

- No new edge functions, no DB changes — purely a UI reshuffle on top of existing Alex/voice/upload/router infrastructure.
- Sticky bottom CTA bar removed on this page (the orb + chat replace it).
- "3 soumissions" is demoted to one chip among others — never a hero offer.
