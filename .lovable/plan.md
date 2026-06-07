## Scope

Only `src/pages/PageHomeUnicorn.tsx`. No changes to hero, orb, header, dock, navigation, colors, or section order. `PIMIntroBand` already sits above "Comment fonctionne UNPRO", so the homeowner-first flow is already correct. Two targeted edits:

### 1. Extend "Comment fonctionne UNPRO" from 3 → 4 steps

`HowItWorksCards.steps`:
1. Détection IA — *(unchanged)*
2. Analyse intelligente — *(unchanged)*
3. **Recommandation** — "Alex recommande les meilleures actions selon votre propriété."
4. **Solution** — "Recevez une recommandation personnalisée ou prenez rendez-vous avec le professionnel le mieux adapté."

Horizontal scroll already handles 4 cards (180px each).

### 2. Restyle `ContractorAippSplit` as premium dark "Espace Entrepreneurs"

Per the final "MOS/LOVABLE — Keep Contractor Section" decision (keep section, premium dark identity, no removal).

Outer card:
- Replace `uc-glass-strong` light surface with a dark premium card: background `linear-gradient(135deg, #0B1430 0%, #131B3D 55%, #1B1F4A 100%)`, border `1px solid rgba(99,130,255,0.22)`, box-shadow `0 30px 60px -28px rgba(37,99,255,0.55), inset 0 1px 0 rgba(255,255,255,0.08)`, subtle radial glow overlay top-right (`rgba(59,130,246,0.18)`).
- Radius 24 kept.

Content (all inside the new dark card, light text):
- **Badge** (top): pill `ESPACE ENTREPRENEURS` — uppercase, tracking-wider, 10px, white/85, bg `rgba(99,130,255,0.16)`, border `rgba(147,170,255,0.30)`.
- **Headline** (replaces current): "Faites partie des entrepreneurs recommandés." — white, 18px, extrabold.
- **Subtext**: "UNPRO recommande les professionnels selon leur expertise, leurs résultats et leur compatibilité avec chaque projet." then a thin separator line `"Pas de leads partagés. Pas de course aux soumissions."` in muted blue-grey (`#A6B0D8`).
- **Conversion hook line** (small, italic, `#93A4D9`, 11px): "Les propriétaires ne recherchent plus seulement des entrepreneurs. Ils demandent à l'IA qui elle recommande."
- **CTAs**:
  - Primary (filled, larger — `py-3 px-5`, 13px, full-rounded, `uc-cta` gradient kept): **Activer mon profil** → `/entrepreneur/join`.
  - Secondary (ghost-on-dark, `bg-white/8`, `border-white/20`, text white): **Voir mon score IA** → `/aipp`.
- **Micro benefits** under buttons (2-col grid, 11px, white/80, check-icon `#7CF0B8`):
  - ✓ Rendez-vous exclusifs
  - ✓ Recommandations IA
  - ✓ Visibilité locale
  - ✓ Profil optimisé IA
- **Contractor preview wrapper** (above `NearbyContractorsCarousel`):
  - Header row: "Exemple d'entrepreneur recommandé" (white/70, 11px, uppercase tracking) + small pill `✨ Recommandé par Alex` (blue glass).
  - Keep existing `NearbyContractorsCarousel` component; just wrap it in a `rounded-2xl` lighter inner panel (`rgba(255,255,255,0.06)`, border `rgba(255,255,255,0.10)`, padding 10) so its existing light card pops on the dark surface.

No new files. No changes to `NearbyContractorsCarousel`, `PIMIntroBand`, hero, orb, dock, or routes.

## Technical details

- File: `src/pages/PageHomeUnicorn.tsx`
  - Edit `HowItWorksCards.steps` array (lines 430-434): change step 3 copy and append step 4.
  - Rewrite `ContractorAippSplit` (lines 483-519) per spec above. Inline styles (file uses inline-style theming, not Tailwind tokens, to stay consistent).
- No new imports needed beyond existing `Link`, `ArrowRight`, plus `CheckCircle2` / `Sparkles` from `lucide-react` (already imported elsewhere in file — verify and add to existing import if missing).
- No routing, data, or backend changes.

## Validation

- Visual check on 360 / 390 / 430 / desktop preview: section visibly darker/premium, hero+orb+dock untouched, 4 "Comment fonctionne" cards scroll horizontally, buttons reachable above bottom dock.
