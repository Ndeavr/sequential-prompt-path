## Pivot homepage to "Conversational Concierge" (warm + alive)

Move `/` from the dark sci-fi orb hero to a clean warm Apple/Stripe-style intake where the **microphone is the CTA**, with a subtle living AI presence that only "wakes up" on interaction.

### 1. Theme — warm light hero (mobile-first)

- Reuse the existing `landing-warm` token system (`#F7F6F0`, ink `#0F1B2D`, accent emerald `#0E5E4E`, gold `#C9A24A`) instead of `#060B14`.
- New wrapper component `HeroConciergeWarm.tsx` rendered by `PageHomeSimple` (replaces `HeroOrbMockup` on `/` only — dark orb stays available for other entry points).
- Layout, top to bottom:
  1. Slim header: ☰ · `UNPRO` wordmark · 🔔 (uses existing nav primitives, no new routes).
  2. Gold pill badge: `✦ #1 au Québec pour trouver le bon pro`.
  3. H1 serif (Instrument Serif / existing display font): **"Décrivez votre problème."**
  4. Sub: **"Alex trouve le bon pro. Un seul. Pas 3 soumissions."**
  5. **Mic CTA** (the hero element — see §2).
  6. Input row: text field `Décrivez votre projet, votre problème ou votre urgence…` + photo upload icon (reuses `AlexHomepageConversation` text path).
  7. Three trust rows (replacing fake metrics — see §4).
  8. Sticky bottom tab bar on mobile only: Accueil · Projets · Profil (visual only, links to existing routes).

### 2. Mic-as-CTA + subtle living orb

New `AlexMicOrb.tsx` (replaces giant `AlexFloatingOrb` on `/`):

- **Idle**: 88px emerald disc with white mic icon, soft drop shadow, 2 concentric warm gold rings at 8% opacity doing a slow 3s breathing pulse. Looks like a premium hardware button, not an AI.
- **Hover/focus**: rings tighten, subtle scale 1.02.
- **Listening**: rings expand outward continuously, opacity reactive to mic input volume (use existing `getInputVolume()` from `useConversation`), subtle blue tint added to outermost ring.
- **Thinking**: rings freeze, mic icon swaps to a 3-dot pulse.
- **Speaking**: rings pulse in sync with `getOutputVolume()`, emerald glow intensifies.
- No face, no house icon, no "ALEX · ONLINE" chip in idle. The orb appears alive **only during interaction** — that's the dopamine moment.

Single component, state driven by props from `AlexHomepageConversation`. Stays inline — no route push, no overlay.

### 3. Live transcript directly under the input

Reuse `AlexInlineTranscript.tsx` but render it *below* the input (not below the orb) and only mount once the first message exists. First Alex line streams in word-by-word as TTS plays:

> "Bonjour. Je suis Alex d'UNPRO. Quel problème puis-je vous aider à régler aujourd'hui?"

Use a simple `useEffect` interval to reveal characters in sync with audio start (no new SDK). This makes the page feel magical on first load.

### 4. Replace fake metrics with believable trust row

Three stacked rows with check/shield icons (no numbers fabricated):

- 🛡 **RBQ vérifié** — Chaque pro validé manuellement
- ⚖ **Une seule recommandation** — Pas de soumissions partagées
- ⚡ **Réponse rapide** — Rendez-vous planifié directement

(Hardcoded copy in component; no DB/edge changes.)

### 5. Copy changes

- H1: `Décrivez votre problème.`
- Sub: `Alex trouve le bon pro. Un seul. Pas 3 soumissions.`
- Mic helper (under orb, only when idle): `Appuyez et parlez`
- Alex first message: unchanged (already memory-locked).

### 6. Files

**Create**
- `src/components/home-concierge/HeroConciergeWarm.tsx` — full warm hero
- `src/components/home-concierge/AlexMicOrb.tsx` — reactive mic orb
- `src/components/home-concierge/TrustRow.tsx` — 3-row trust block
- `src/components/home-concierge/MobileTabBar.tsx` — visual bottom nav

**Edit**
- `src/pages/PageHomeSimple.tsx` — render `HeroConciergeWarm` instead of `HeroOrbMockup`, swap `theme-color` meta to `#F7F6F0`
- `src/components/home-orb/AlexHomepageConversation.tsx` — accept a `renderOrb` slot prop so the warm hero can inject `AlexMicOrb` while keeping all conversation/voice plumbing intact

**Untouched**
- `AlexFloatingOrb`, `HeroOrbMockup` (kept for other surfaces / quick rollback)
- `alexVoiceConfig`, `alexAgentOverrides`, `alexCorePrompt`, `prepareAlexSpeechText` (voice + pronunciation already locked)
- All Stripe, auth, contractor onboarding, `/pros/[slug]`, admin
- DB, edge functions, RLS

### 7. Restore checkpoint

Before changes: `UNPRO_PRE_CONCIERGE_WARM_HOMEPAGE`.

### 8. Acceptance

- `/` on mobile (384px) shows warm cream hero, serif H1, single emerald mic, no dark surface.
- Tapping the mic starts the existing ElevenLabs session inline; orb rings react to volume; transcript streams under input.
- No navigation, no overlay opens.
- Lighthouse contrast passes on warm tokens.
- No console errors; existing voice/text/upload flows unchanged.
- Dark `HeroOrbMockup` still importable and usable elsewhere.

### Out of scope

Backend, schema, agents, pricing, SEO routes, contractor flows, condo flows. Pure presentation refactor on `/`.
