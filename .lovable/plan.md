## Goal

Replace the current footer (and the "UNPRO continue de travailler…" block) with a rich **Trust & Intelligence Footer** that reinforces UNPRO's Home Intelligence positioning, adds a **Manifeste UNPRO** page, a **"Pourquoi nous ne demandons pas 3 soumissions"** page, and an **Intelligence Hub** category grid for AEO/SEO depth.

This is presentation + content + routing only — no business logic, no schema changes.

---

## 1. New global footer component

Create `src/components/layout/SiteFooterIntelligence.tsx` — replaces all current footer usages.

Structure (mobile-first, stacked → 4 columns ≥ md):

```text
┌─────────────────────────────────────────────────────────┐
│  TRUST BLOCK (full width)                               │
│  "Votre maison devrait se souvenir de tout."           │
│  Short paragraph (renovations, garanties, inspections)  │
├──────────────┬──────────────┬──────────────┬───────────┤
│ PROPRIÉTAIRES│ ENTREPRENEURS│ À PROPOS     │ INTEL HUB │
│  Solutions   │  Croissance  │  Mission     │  14 cats. │
│  Intelligence│  Ressources  │  Manifeste   │  → SEO    │
│   Maison     │              │  Pages       │           │
├─────────────────────────────────────────────────────────┤
│  © 2026 UNPRO · Québec · Canada · FR | EN              │
└─────────────────────────────────────────────────────────┘
```

Link content matches the user's spec exactly (Solutions, Intelligence Maison, Croissance IA, Ressources, À propos, Intelligence Hub). All routes resolve to existing pages where possible; missing ones get stubs (see §4).

Visual: matches `landing-warm` on public pages, `alex-immersive` glass on dark pages — token-only (no hardcoded colors), per readability rule.

## 2. Mount the new footer

- Replace existing footer in `src/layouts/MainLayout.tsx` (current `TrustFooterStrip` becomes legacy).
- Remove the "UNPRO continue de travailler même lorsque vous quittez le site" copy block from wherever it appears (search across `src/`).
- Keep `StickyTrustFooter` (checkout) untouched — different surface.

## 3. Intelligence Hub grid

Inside the footer, the "Intelligence Hub" column renders a compact 14-category list. Each chip links to the existing `/probleme/:slug` or `/services` SEO routes when a slug exists, otherwise to the Intelligence Hub hub page (`/intelligence`). Categories per spec: Toiture, Isolation, Ventilation, Électricité, Plomberie, Chauffage, Climatisation, Portes et fenêtres, Fondation, Drain français, Moisissure, Amiante, Gestion de copropriété, Inspection préachat.

Data file: `src/data/intelligenceHubCategories.ts` (label + slug + target route).

## 4. New pages

| Route | File | Purpose |
|---|---|---|
| `/manifeste` | `src/pages/PageManifesteUnpro.tsx` | Full Manifeste copy from user spec, dark cinematic, single H1 "Le Manifeste UNPRO", JSON-LD `Article` |
| `/pourquoi-pas-trois-soumissions` | `src/pages/PagePourquoiPasTroisSoumissions.tsx` | Attacks the 3-quotes workflow, links to `/compare-quotes` and `/alex` |
| `/intelligence` | `src/pages/PageIntelligenceHub.tsx` | Hub listing the 14 categories with internal links into existing SEO clusters |

All three: `<Helmet>` title + description + canonical + OG, `InternalLinksTrust` at the bottom.

Register in `src/app/router.tsx` and add to `public/sitemap.xml` + `public/llms.txt`.

## 5. Router + nav constants

Add new routes to `src/config/routesConfig.ts` (`MANIFESTE`, `WHY_NOT_THREE_QUOTES`, `INTELLIGENCE_HUB`).

## 6. SEO

- Update `seoSchema.ts` `organizationSchema` `knowsAbout` to include the 14 hub categories.
- Sitemap: add `/manifeste`, `/pourquoi-pas-trois-soumissions`, `/intelligence`.
- `llms.txt`: add the three pages under a "Manifeste & Intelligence" section.

## 7. Memory

Update `mem://positioning/home-intelligence-category` with: footer must surface Manifeste + Intelligence Hub + "Pourquoi pas 3 soumissions" on every public page. Forbidden footer copy: "UNPRO continue de travailler même lorsque vous quittez le site".

---

## Out of scope (this turn)

- Writing the full body content for every Intelligence Hub category page (those already live under `/probleme/*` and `/services`).
- Backend, schema, edge functions, Alex prompt changes.
- English translation of the new pages (FR-first; EN can come later).
- Replacing footers inside `/admin/*`, `/pro/*`, `/dashboard/*` authenticated layouts — those keep their app-shell footers.

---

## Files touched

**Created:** `SiteFooterIntelligence.tsx`, `intelligenceHubCategories.ts`, `PageManifesteUnpro.tsx`, `PagePourquoiPasTroisSoumissions.tsx`, `PageIntelligenceHub.tsx`.
**Edited:** `MainLayout.tsx`, `router.tsx`, `routesConfig.ts`, `seoSchema.ts`, `public/sitemap.xml`, `public/llms.txt`, `mem://positioning/home-intelligence-category`, `mem://index.md`.
