## Live Score Reveal Animation

Replace the static "Analyse en cours…" button state on `/pro/score` with a cinematic, dimension-by-dimension reveal of the 5 score bars while the analysis runs.

### Behavior
On form submit:
1. Form fades/collapses out (~250ms).
2. A "Reveal" panel mounts immediately with the 5 dimension rows (Visibilité IA, Confiance numérique, Autorité locale, Profil entrepreneur, Potentiel de croissance) — labels visible, bars empty, values shown as `--/100`.
3. The edge function `pro-score-instant` is called in parallel.
4. Each row activates sequentially every ~700ms:
   - label brightens
   - bar fills from 0 → target % using easeOutCubic over ~1100ms
   - score number counts up from 0 → target in sync with the bar
   - subtle shimmer sweep across the bar while filling
   - small status caption under the row ("Analyse Google…", "Lecture des avis…", "Sondage des moteurs IA…", "Audit du profil entrepreneur…", "Projection de croissance…") that resolves to a green check when the row completes
5. While the API hasn't returned yet, bars use **placeholder targets** (animated to ~60-75%) so motion never stalls. Once the real payload arrives, the remaining rows snap to real targets; already-completed rows tween to their real value.
6. After the 5th row completes AND data is loaded, `ScoreRevealCard` (Opportunités + CTA) fades in below.
7. If the API errors, abort the reveal, restore the form, toast the error.

### Files
- **New** `src/components/first-customer-48h/LiveScoreReveal.tsx` — self-contained reveal component. Props: `targets: Scores | null` (null until API resolves), `onComplete: () => void`. Uses `requestAnimationFrame` for count-up + width tweens, sequential `setTimeout` chain for row activation, cleanup on unmount.
- **Edit** `src/pages/pro/PageProScoreInstant.tsx`:
  - Add `phase: "form" | "revealing" | "done"` state.
  - On submit: set `phase = "revealing"`, fire the edge call, store result when it lands.
  - Render `<LiveScoreReveal targets={result?.scores ?? null} onComplete={...} />` during `revealing`.
  - When both reveal animation finished AND result loaded → switch to `done` and render existing `<ScoreRevealCard />`.
  - On error: revert to `phase = "form"`, toast.

### Visual details (matches existing warm-neutral theme)
- Row container: same `#FFFFFF` card, `rgba(11,18,32,0.08)` border, `28px` radius.
- Bar track: `#E2E8F0`, height 8px, radius 999px.
- Bar fill color from existing `tone()` helper (green ≥80, amber ≥65, orange <65) but during animation use neutral blue `#2563FF` until the row "resolves" then crossfades to the tone color (signals "scoring complete").
- Active row gets a soft `box-shadow: 0 8px 24px -10px rgba(37,99,255,0.25)` and label weight bumps to 700.
- Shimmer: a 40%-wide white gradient strip translating left→right inside the fill, looped while active.
- Completed rows: small `CheckCircle2` (emerald) appears next to the score number.
- Caption text size `text-[11px]`, color `#64748B`, transitions to `#10B981` on completion.
- Reduced-motion: respect `prefers-reduced-motion` → skip shimmer + count-up, just fade values in.

### Constraints
- Frontend-only change. No edge function, schema, or pricing changes.
- No new deps (use existing `framer-motion` already in the project or pure RAF — prefer RAF + CSS transitions to keep bundle clean).
- Keep `trackFirstCustomerEvent("score_completed", ...)` firing only after real result lands (unchanged analytics contract).
