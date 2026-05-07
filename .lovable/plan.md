# UNPRO — Homepage AI-First Rebuild + Alex Companion

Massive scope (homepage rewrite + global Alex companion + intent router + performance pass). Splitting into 3 sequential phases. **Phase 1** ships the new homepage today; Phase 2 wires the companion router; Phase 3 polishes perf + sticky contextual orb. Phase 1 alone already delivers the ChatGPT/Perplexity feel and the LCP fix.

## Phase 1 — Homepage AI-Native Rewrite (this build)

### New homepage structure
Rewrite `src/pages/Home.tsx` and create one new component. Keep dark theme, blue aura, orb identity, glassmorphism. Remove every below-the-fold section from the homepage (kept in codebase, just unmounted from `/`).

```text
┌─ Minimal header (logo • FR/EN • Connexion)
│
│      H1: "Décrivez votre problème.
│           Alex s'occupe du reste."          ← rendered instant, no opacity:0
│      Subtext: "Analyse. Estimation. Vérification. Réservation."
│
│              ◉  ALEX ORB (96px, breathing aura)
│
│   ┌────────────────────────────────────────┐
│   │  Décrivez votre projet…       🎤  📷  │   ← AI input bar
│   └────────────────────────────────────────┘
│
│   [Estimer] [Vérifier un pro] [Comparer 3 soumissions]
│   [Problème urgent] [Téléverser une photo] [Je ne sais pas]
│
│   ✓ Entrepreneurs vérifiés  ✓ Pas de leads partagés
│   ✓ Analyse IA              ✓ Service québécois
└─
```

### Files

**`src/pages/Home.tsx` — full rewrite**
- Remove all 8 lazy section imports (`SectionAlexConversationAd`, `SectionNoMoreQuotes`, `SectionManifestoCTA`, `SectionPasseportCards`, `SectionHowItWorks`, `SectionEntrepreneurCTA`, `SectionHomeCounterImpactIA`, `SectionTrustProof`, `BarStickyCounterRealtime`).
- Render only `<HeroSectionAlexFirst />` inside `MainLayout`.
- Keep Helmet JSON-LD (Service + FAQ) — required for SEO.

**`src/components/home/HeroSectionAlexFirst.tsx` — NEW**
Replaces `HeroSection.tsx` for the homepage (old file kept untouched, used elsewhere if any).
- LCP-first: `<h1>` rendered with `opacity:1` from frame 0 (no AnimatePresence wrapper hiding it).
- Centered column, mobile-first, max-w-xl.
- Cinematic background reused (`hero-bg.webp` poster + `<video>` lazy via `loading="lazy"` on poster, video defers to `requestIdleCallback`).
- Orb visible from frame 0 (96px, same gradient/glow tokens as current `HeroSection`).
- Voice init **deferred** to first user interaction OR `requestIdleCallback` (≥800ms after paint) — `useLiveVoice` + `alexRuntime` only imported then via dynamic `import()`.
- Input bar: pill-rounded, glass, `placeholder="Décrivez votre projet…"`, mic + camera buttons inside.
- 6 chip pills (`Estimer`, `Vérifier un entrepreneur`, `Comparer 3 soumissions`, `Problème urgent`, `Téléverser une photo`, `Je ne sais pas`) — each chip dispatches an intent (Phase 2 wires routing; Phase 1 opens `AlexAssistantSheet` with the chip text pre-filled).
- 4-icon trust strip (single row, mobile wraps to 2×2).
- No giant sections, no "Passez à l'intelligence du bâtiment" hero text — replaced.

**`src/layouts/MainLayout.tsx`** — header simplification on `/` route only:
- Detect `useLocation().pathname === "/"` and render a slim variant: logo left, FR/EN + Connexion right. Hamburger removed on `/`.
- Other routes keep existing nav.

### Performance fixes (Phase 1 deliverable)
- Drop the 8 below-the-fold imports → ~200 KB JS off initial bundle.
- H1 visible at frame 0 → fixes NO_LCP.
- Voice stack (`useLiveVoice`, `alexRuntime`, `alexAudioChannel`, `useAlexSingleton`, ElevenLabs) lazy-imported via `import()` after first user gesture.
- `<video>` element only mounted after `requestIdleCallback`; poster `<img>` shown immediately as LCP candidate with `fetchpriority="high"`.
- Eliminates ~6 framer-motion choreography timers running on first paint.

### Targets
- LCP < 2.5s mobile (poster WebP is 106 KB, preloaded).
- FCP < 1.8s.
- CLS ~ 0 (fixed orb + h1 sizes).
- TBT < 200ms (voice stack deferred).

## Phase 2 — Alex Companion + Intent Router (next prompt)

Will create:
- `src/services/alexIntentRouter.ts` — central map `{ intent → { route, opener, nextActions, requiredData, fallback } }` for the 11 intents listed (homeowner_problem, project_estimate, quote_compare, verify_contractor, find_pro, photo_upload, contractor_growth, contractor_onboarding, partner_affiliate, property_manager, unknown).
- `src/components/alex/AlexCompanionOrb.tsx` — sticky bottom-right shrunk orb (48px), framer `layoutId="alex-orb"` morph from hero (96px) → companion (48px) with no layout shift.
- `src/components/alex/AlexContextualPanel.tsx` — per-route opener message + next-action chips.
- Page-level Alex contexts: estimate, compare, verify, contractor growth, photo upload (one config map, no per-page edits needed).
- `prefers-reduced-motion` respected; manual page interaction always available.

## Phase 3 — Sticky Orb Polish + AEO Migration (later)

- Move SEO-heavy content (manifesto, how-it-works, entrepreneur CTA, no-more-quotes) to dedicated routes if not already there.
- Sticky companion orb gets contextual labels: "Décrivez votre problème", "Analysons votre photo", etc.
- Lighthouse pass + final tuning.

## Phase 1 Success
- Homepage = header + h1 + subtext + orb + input + chips + trust strip. Nothing else.
- All giant sections gone from `/`.
- H1 paints instantly. Orb appears at frame 0. Voice connects on first interaction (not on load).
- Visual identity preserved (dark, blue glow, glassmorphism).
- `/emergency-reset`, `/role`, login, all other routes untouched.

Phase 1 ships now. Phases 2–3 require separate approval.
