## Rebuild homepage bottom section + premium footer

Replace the current dark blue `SiteFooterIntelligence` block and the legacy `SmartFooter` with a two-part premium finish:

1. **Emotional closing section** — "Votre maison se souvient."
2. **Premium dark footer** — 4 columns + trust bottom bar.

Applied globally via `MainLayout` (both blocks currently render on every public page, so replacement stays consistent).

---

### 1. New emotional section — `SectionMemoireMaison`

New file: `src/components/layout/SectionMemoireMaison.tsx`

Content (exact, verbatim from user):

- **Headline (H2, large, tight tracking)**: `Votre maison se souvient.`
- **Body** — 5 short lines, each on its own row, muted rhythm:
  - Elle conserve son historique.
  - Elle retrouve ses documents.
  - Elle anticipe les entretiens.
  - Elle vous aide à éviter les mauvaises surprises.
  - Bienvenue dans le Passeport Maison.
- **Subtext**: `UNPRO aide les propriétaires québécois à conserver l'information importante de leur propriété afin de prendre des décisions plus éclairées, plus rapides et plus rentables.`
- **Primary CTA**: `Créer mon Passeport Maison` → `/dashboard/properties/new`
- **Secondary CTA**: `Parler à Alex` → `/alex`

Visual:
- Dark cinematic background (base `#050816` with subtle radial glow top, no gradient stripe)
- Centered column, max-w-3xl, generous vertical rhythm (py-24 md:py-32)
- H2 uses `text-4xl md:text-6xl font-semibold tracking-[-0.03em]` in `text-foreground`
- Body lines in `text-lg md:text-xl text-foreground/85`, stacked with `space-y-2`
- Subtext in `text-sm md:text-base text-muted-foreground max-w-xl`
- CTAs: primary = filled premium button (bg-primary, rounded-2xl, h-14, px-8); secondary = ghost outline
- Mobile-first: stacks CTAs vertically <sm, side-by-side ≥sm

### 2. New footer — `SiteFooterPremium`

New file: `src/components/layout/SiteFooterPremium.tsx`. Replaces `SiteFooterIntelligence` + `SmartFooter`.

Structure (single dark container, `border-t border-white/10`, bg near-black gradient):

**Top brand block (spans full width or col 1)**
- Wordmark **UNPRO** (large, tight)
- `L'intelligence artificielle au service des propriétaires québécois.`
- `UNPRO aide les propriétaires à comprendre leur maison, conserver son historique, anticiper les problèmes et trouver les bons professionnels au bon moment.`

**4 columns** (grid, 1 col mobile / 2 cols sm / 4 cols lg):

- **Pour les propriétaires**
  - Passeport Maison → `/pim`
  - Score Maison → `/dashboard/home-score`
  - Trouver un entrepreneur → `/alex`
  - Vérifier un entrepreneur → `/verifier-entrepreneur`
  - Intelligence copropriété → `/copropriete`
  - Alex → `/alex`
- **Pour les entrepreneurs**
  - Être recommandé par l'IA → `/entrepreneurs`
  - Activation 7 jours à 1 $ → `/pro/activate`
  - Plans et tarifs → `/pricing/entrepreneurs`
  - Fonctionnement → `/comment-fonctionne-ia`
  - Centre d'aide → `/aide`
- **Ressources**
  - Journal → `/journal`
  - FAQ → `/faq`
  - Contact → `/contact`
- **Confiance**
  - Politique de confidentialité → `/confidentialite`
  - Conditions d'utilisation → `/conditions`
  - Vérification RBQ → `/verifier-entrepreneur`

All destinations verified against `src/app/router.tsx` — no dead links.

**Bottom bar** (`border-t border-white/10 mt-16 py-6`, flex between, wraps on mobile):
- Left: `UNPRO © 2026`
- Center (italic, muted-foreground): `Votre maison devrait se souvenir de tout.`
- Right: `Québec • Canada`

Visual:
- Background: solid `#050816` with 1% white noise overlay to match Cinematic Dark base
- Column headings: `text-[11px] uppercase tracking-[0.22em] font-semibold text-foreground/70`
- Links: `text-sm text-muted-foreground hover:text-foreground transition-colors`
- Brand wordmark: `text-3xl font-bold tracking-[-0.04em] text-foreground`
- Padding: `py-16 md:py-20`, max-w-7xl, px-6

### 3. Wire into layout

Edit `src/layouts/MainLayout.tsx`:
- Remove imports and JSX for `SiteFooterIntelligence` and `SmartFooter`.
- Add `SectionMemoireMaison` before the footer.
- Add `SiteFooterPremium` after.
- Keep `FooterSEOGrid` conditional as-is (SEO routes only).

Result:
```text
...children
  → FooterSEOGrid (conditional)
  → SectionMemoireMaison
  → SiteFooterPremium
```

### Technical notes
- Semantic tokens only (`text-foreground`, `text-muted-foreground`, `bg-background`, `bg-primary`). No hardcoded hex outside the section's base bg constant.
- `<Link>` from `react-router-dom` for all navigation.
- No new packages, no data fetching, purely presentational.
- Legacy `SiteFooterIntelligence.tsx` and `SmartFooter` files kept on disk (unused) so any deep imports elsewhere don't break; can be pruned in a later cleanup.

### Scope guardrails
- Frontend/presentation only.
- No changes to Alex, routing config, analytics, or business logic.
- All copy verbatim from the user's brief.
