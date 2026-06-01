## Rebuild the entrepreneur AIPP flow for readability + premium hierarchy

Scope is the active diagnostic page covering every screen in your screenshots:
`src/pages/entrepreneur/PageEntrepreneurDiagnosticLanding.tsx` — verification card, identification form, situation sliders, AIPP score reveal, revenue projection, plan recommendation, sticky CTA.

### Root cause of the current look

The shadcn `Card` primitive defaults to `bg-card text-card-foreground` (light theme tokens), which is why every card renders as a pale white-to-grey gradient with dark text on a dark page — the `bg-white/[0.03]` class is being defeated by the underlying token. All cards on this page need to be raw dark surfaces, not the `Card` primitive.

### Token decisions (page-local, no global theme change)

Surfaces
- card base: `rgba(9,14,28,0.88)` + 1px border `rgba(255,255,255,0.08)` + shadow `0 10px 40px rgba(0,0,0,0.35)` + backdrop-blur 20px, radius 24px
- input base: `rgba(255,255,255,0.04)`, border `rgba(255,255,255,0.10)`, height 56px, radius 18px, focus = electric blue ring + soft outer glow

Text
- primary `rgba(255,255,255,0.96)` • secondary `rgba(255,255,255,0.72)` • muted `rgba(255,255,255,0.48)` • placeholder `rgba(255,255,255,0.32)`

Accents
- electric blue `#2563EB`, violet `#7C3AED`, cyan `#22D3EE`, amber only for "money on the table"

CTAs
- Primary 58px, gradient `linear-gradient(90deg,#2563EB,#7C3AED)`, shadow `0 10px 30px rgba(37,99,235,0.35)`, weight semibold
- Secondary ghost with `border-white/15`

### Component rebuilds inside the page

1. **Replace every `Card` import** with a local `Surface` div using the dark token block above. No gradient on the surface itself. Inner accent gradients are allowed but must sit behind a solid dark base so text never touches a light gradient.

2. **ProgressBar** — track `rgba(255,255,255,0.06)`, h-[3px], rounded-full, animated fill `linear-gradient(90deg,#2563EB,#7C3AED)` with motion width transition. 8px gap from card below.

3. **Identification step (Step0)** — uppercase label `text-[11px] tracking-[0.14em] text-white/55`, stack icon+label, then full-width input. On mobile force single column (drop `sm:grid-cols-2` for the web/phone pair → stack always until ≥640px). Add `mt-1.5` between label and field. Trust line at bottom: lock icon + "Aucune carte requise · Analyse privée · Données non partagées".

4. **Sliders (Step1)** — value chip right-aligned with tabular-nums + token weight; bump `mb-3`; add 24px vertical rhythm between rows. Lead-source chips: pill height 36px, active = electric blue solid, inactive = `bg-white/[0.04]` + border `white/12`.

5. **VerificationFlow card** — keep avatar+content layout but rewire to the new dark surface. Title `text-[15px] font-semibold text-white`, body `text-[14px] text-white/72`. Primary CTA "Vérifier l'entreprise" → new gradient button. Helper text muted. Confirm rows: 14px, increase row gap to 10px, confidence chip pill style.

6. **AIPP score reveal** — rebuild as three stacked blocks:
   - **Top hero**: SVG ring (stroke 8, gradient `#2563EB→#7C3AED→#22D3EE`, animated dasharray on reveal) with the large number centered (`text-[88px] font-black tabular-nums`), `/100` muted, status label below in semibold. Solid dark interior — no white gradient.
   - **Insight summary**: single line card explaining the score band (replaces the current overlapping subtitle).
   - **Metric stack**: ALWAYS single column on mobile (drop `sm:grid-cols-2`), 16px vertical gap. Each metric row = title left, score right (tabular), horizontal bar full-width below, optional 1-line insight. Bar fill uses the gradient; track `white/8`.

7. **Revenue projection card** — replace the amber-on-white wash with a deep navy surface `#0A1736 → #050816`. Two stacked blocks on mobile (no grid). "Avec UNPRO" block keeps the amber accent only on numbers and a thin top border `border-t border-amber-400/30` — not as the entire background. Body paragraph readable in `text-white/80`.

8. **Plan recommendation card** — fix the Premium overlap:
   - Header row stacks vertically on mobile: badge → plan name (3xl) → subtitle on its own line → price block left-aligned with `text-[40px]` + `/ mois CAD` muted underneath.
   - Reasons list 14px white/85, primary CTA full-width 58px gradient, secondary ghost full-width on mobile.
   - Footer micro-trust: shield icon + "Aucun engagement · Annulable en 1 clic".

9. **Sticky mobile CTA** — keep but add `pb-[env(safe-area-inset-bottom)]`, raise the page's bottom padding to clear it (`pb-40 lg:pb-32`), and apply the new gradient button.

10. **AlexNarrator copy + aria** — replace `ariaLabel="Alex — touchez pour réécouter"` with `"Alex"` (UX copy rule: never instruct touching the orb). Caption text stays.

### Accessibility + clipping audit

- All cards: remove `overflow-hidden` unless inner content requires it (the plan card's blur halo keeps it).
- Inputs: `min-h-[56px]` to clear 44×44 tap.
- Body text: minimum 15px; CTAs minimum 17px label.
- No fixed heights on cards — all `min-h` where bounded.
- Add `break-words` to plan subtitle and revenue numbers to prevent edge clipping.

### Out of scope

- No changes to scoring math, plan recommendation logic, intake session hook, checkout routing, or pricing.
- No global theme/token edits — all dark surfaces are local to this page.
- Other pages keep their current look; if you want this same treatment applied to other entrepreneur pages, that's a follow-up.
