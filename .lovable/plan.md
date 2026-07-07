# UNPRO Repositioning — Passeport Maison First

Shift UNPRO's category from "contractor marketplace" to "Home Intelligence Platform" with the **Passeport Maison** as the hero product. Contractor recommendations become a downstream feature.

---

## 1. New messaging system (single source of truth)

Create `src/lib/copy/passportPositioning.ts` — canonical FR copy tokens used across landing, dashboard, Alex, contractor pages, meta tags:

- `HERO_H1` = "En avez-vous assez de toujours repartir de zéro ?"
- `HERO_SUB` = "Votre Passeport Maison conserve l'historique de votre propriété..."
- `PRIMARY_CTA` = "Créer mon Passeport Maison" → `/passport/new`
- `SECONDARY_CTA` = "Découvrir mon historique immobilier" → `/passport/discover`
- Forbidden phrases list (for content-guard): "Trouver un entrepreneur", "Obtenir 3 soumissions", "Recevoir des prix" as primary CTAs, "marketplace", "annuaire".

Extend `src/content-guard/rules.ts` to flag the forbidden primary-CTA phrases so future edits can't regress.

## 2. Homepage rewrite (`/` = `PageHomeCopilot`)

Replace hero + below-fold sections while keeping the cinematic dark shell:

- **Hero**: new H1/sub/CTAs from the copy module. Primary → Passeport, secondary → "Comment ça fonctionne".
- **Section « Tout ce qui concerne votre propriété »** — 8 cards: Historique des travaux, Inspections, Garanties, Factures, Photos avant/après, Entretiens, Professionnels utilisés, Documents importants.
- **Section « Prenez de meilleures décisions »** — 5-bullet value list.
- **Section « Votre maison évolue »** — explains Passeport Maison lifecycle.
- Keep `PropertyIntelligenceTicker` and `StickyBottomAlexCTA` (relabel sticky CTA to "Créer mon Passeport Maison").
- Update `<Helmet>` title/description/JSON-LD to Home Intelligence Platform framing.

New components under `src/components/home-passport/`: `HeroPassport.tsx`, `WhatFitsInsideGrid.tsx`, `BetterDecisionsSection.tsx`, `HomeLifecycleSection.tsx`.

## 3. Owner dashboard → "Passeport Maison"

Rename homeowner dashboard shell + add sectioned view:

- Rename `PageHomeownerDashboard` header to **Passeport Maison**.
- New tabbed/sectioned layout: Historique · Entretiens à venir · Budget 1/5/10 ans · Garanties · Documents · Professionnels recommandés · Risques détectés · Valeur protégée.
- Reuse existing services (`propertyInsightService`, `predictionService`, `homeScoreService`) to feed each section; sections with no data show empty-state CTAs ("Ajouter votre première facture", etc.).
- Sidebar/nav label updated in `DashboardLayout`.

## 4. Alex onboarding reframe

Update `src/services/alexOpeningTemplates.ts` + `alexCopy.ts`:

- New homeowner opening: **"Bonjour. Comment puis-je vous aider avec votre maison aujourd'hui ?"**
- Replace homeowner quick-action set with:
  1. Construire mon Passeport Maison
  2. Planifier un projet
  3. Prévoir mes entretiens futurs
  4. Comprendre l'état de ma maison
  5. Trouver un professionnel recommandé
  6. Comparer des soumissions
  7. Vérifier un entrepreneur
- Update `QUICK_ACTIONS` in `alexCopy.ts` and any registry driving the mobile action grid (`HomeIntelligenceActionGrid`).
- Update memory Core rule for Alex opening to the new line.

## 5. Contractor landing repositioning

Rewrite the public contractor-facing pages (`/entrepreneurs`, `ContractorLandingCta`, `PageProIsolationQC`, master message memory):

- H1: **"Et si l'IA recommandait votre entreprise ?"**
- Sub: "Soyez identifié comme le bon professionnel au bon moment."
- CTA: "Être recommandé par UNPRO".
- Replace "leads qualifiés" copy with "recommandation contextuelle".
- Keep pricing/checkout logic intact — copy layer only.

## 6. Blog / SEO clusters

- Add 7 seed article stubs (`src/data/mockBlogPosts.ts` or content system in use) with the titles listed in the brief.
- Extend SEO service (`renovationContentService`, sitemap) with a new cluster registry: passeport-maison, historique-maison, carnet-entretien, budget-entretien, etc. — generates canonical URLs and internal links.
- Update sitemap generation to include the new cluster URLs.

## 7. Head metadata + JSON-LD

Update `index.html` + per-route `<Helmet>` on Home, Dashboard, Contractor landing to reflect Home Intelligence Platform. New sitewide `Service` schema: `serviceType: "Home Intelligence Platform"`. Add `WebSite` schema with the new brand statement.

## 8. Onboarding outcome contract

Homeowner post-auth flow must guarantee, before exit:
1. Passeport record created (existing `PropertyForm` path — relabel to "Passeport Maison").
2. Property profile saved.
3. Initial maintenance roadmap generated (`predictionService`).
4. Suggested next actions rendered.

Contractor discovery moves to an optional post-passport step.

## 9. Memory + governance

Update `mem://index.md` Core:
- **Positioning** rule → replace "Home Intelligence Platform" line with explicit "Passeport Maison is the product, contractor recommendations are a feature."
- **Alex opening (homeowner)** → new line.
- Add forbidden primary-CTA phrases (marketplace, 3 soumissions, trouver un entrepreneur as primary).

Add memory file `mem://brand/passport-first-positioning` documenting the full copy contract.

---

## Out of scope (this pass)

- No pricing changes, no checkout logic, no Stripe changes.
- No changes to Premier Dollar sprint infra (`/isolation-qc`, sprint dashboard) — those keep their contractor-acquisition role.
- No new backend tables — reuse existing `properties`, `property_events`, `property_documents`, `property_recommendations`.
- No visual redesign of the cinematic dark shell — copy + section swap only.

## Technical notes

- All new copy flows through `passportPositioning.ts` — components import tokens, no inline FR strings.
- Content-guard rule addition prevents accidental "trouver un entrepreneur" primary CTAs.
- Alex quick-action registry is the single point of change for the 7-option menu; used by both `AlexQuickActions` and `HomeIntelligenceActionGrid`.
- Homeowner dashboard reuses existing services — no new data fetching contracts.
- SEO cluster registry extends the current programmatic SEO engine rather than replacing it.

## Success criteria

- Homepage above-the-fold shows Passeport hero + "Créer mon Passeport Maison" as the only primary CTA.
- Dashboard header reads "Passeport Maison" with 9 sections wired to real (or empty-state) data.
- Alex opens with the new homeowner line and shows the 7-option quick actions.
- Contractor landing leads with "Et si l'IA recommandait votre entreprise ?" — no "leads" language in H1/sub.
- Content-guard fails builds that reintroduce forbidden primary CTAs.
- Memory Core reflects the new positioning; a fresh session applies it automatically.
