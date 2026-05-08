## Diagnostic

The screenshot (`unpro.ca/onboarding`) shows a generic "Cette fonctionnalité arrive bientôt" page. Investigation reveals:

- **74 routes** in `src/app/router.tsx` are wired to `<FallbackRoutePage />` (the "coming soon" placeholder).
- The current code wires `/onboarding` correctly to `OnboardingPageUnpro`, but production (`unpro.ca`) is running an **older deploy** where it was a fallback. Publishing alone fixes `/onboarding`.
- The other 74 fallback routes are dead end-user URLs (homepage links, footer, dashboard nav, condo, pro, services). Most have a real page already built in `src/pages/` (158 page files exist) — they were simply never wired.

## Goal

Make every public route render real content. Zero "Cette fonctionnalité arrive bientôt" page in production.

## Plan

### Phase 1 — Audit & Map (no code changes)

For each of the 74 fallback URLs, classify:

| Bucket | Action |
|---|---|
| **A. Has a real page built** | Swap `<FallbackRoutePage />` → real component import |
| **B. Aliases an existing flow** | Redirect to the canonical URL (e.g. `/score-aipp` → `/entrepreneurs/score-aipp` once built) |
| **C. Truly not built** | Replace with a minimal real page (hero + CTA to Alex + relevant content), not a generic placeholder |

Likely mappings (high confidence, to confirm by file inspection):

```text
/proprietaires/passeport-maison    → PropertyGraphPage / passport flow
/proprietaires/score-maison        → useHomeScore page
/outils-ia                         → AnswerEnginePage or new index
/services/toiture|fondation|...    → CityServicePage with slug
/entrepreneurs/creer-mon-profil    → ContractorOnboardingPage
/entrepreneurs/score-aipp          → AIPPScorePage / PageAuditAIPPv2
/entrepreneurs/profil-public       → ContractorProfile
/entrepreneurs/matching            → MatchingResultsPage
/entrepreneurs/badges              → AuthorityDashboardPage
/entrepreneurs/demo                → BookingClientDemoPage
/aide /faq                         → PageUnproFAQ25
/professionnels                    → ProfessionnelsPage2
/villes                            → PageCityServiceCoverage
/guides                            → PageGuidesHomeProblems (already wired twice — fix duplicate)
/plans-prix                        → PricingPage
/favoris /historique /alertes      → DashboardLayout sub-pages
/messages                          → existing messaging feature
/condo/*                           → CoproprietePage variants
/pro/stats /pro/visibility         → contractor dashboard sub-pages
/conseils-renovation               → BlogPage2 filtered
/a-propos /contact /conditions     → simple static content pages (build minimal real)
```

### Phase 2 — Wire (single PR per cluster)

Cluster edits to keep diffs small and reversible:

1. **Homeowner cluster** — `/proprietaires/*`, `/favoris`, `/historique`, `/mes-projets`, `/mes-rendez-vous`
2. **Contractor cluster** — `/entrepreneurs/*`, `/pro/*`
3. **Condo cluster** — `/condo/*`, `/loi-16`, `/fonds-prevoyance`, `/immeubles`, `/interventions`
4. **Services cluster** — `/services/*` → use `CityServicePage` with service slug param
5. **Discovery / SEO cluster** — `/professionnels`, `/villes`, `/guides`, `/conseils-renovation`, `/aide`, `/faq`
6. **Account cluster** — `/compte`, `/notifications`, `/messages`, `/facturation`, `/analytics`, `/settings-systeme`
7. **Static content cluster** — `/a-propos`, `/contact`, `/conditions`, `/confidentialite`, `/cookies`, `/accessibilite`, `/nos-standards`, `/pourquoi-pas-3-soumissions`, `/verification` (build 1 reusable `StaticContentPage` + 9 markdown blocks, themed dark/warm per memory rules)

### Phase 3 — Verify

- Build passes, lazy chunks split correctly.
- Browser sweep: visit every wired URL in preview at 384px viewport, confirm no fallback, no white screen, no console error.
- `FallbackRoutePage` reduced to 1 use (the `*` catch-all → keep it as the actual 404, with a "Retour" CTA).
- Publish to push fix live (this alone unblocks `/onboarding` on `unpro.ca`).

## Anti-regression

- Do not touch `OnboardingPageUnpro`, `UniversalRouteGuard`, role buttons, Alex chat, or edge functions — already stabilized in prior turns.
- Do not delete `FallbackRoutePage` (still used as final 404).
- Keep all existing route-level guards (`UniversalRouteGuard`, `OnboardingGuard`, `PartnerGuard`).
- One file edited per cluster (`src/app/router.tsx`) plus any new minimal pages added under `src/pages/static/`.
- Preserve dark theme on `/app.unpro.ca` routes, warm theme on public `unpro.ca` routes (per memory).

## Success

- 0 routes returning `FallbackRoutePage` except `*`.
- Every URL in the navigation, footer, and dashboards renders production-quality content.
- `/onboarding` on `unpro.ca` shows the real onboarding flow after publish.

## Open question

Do you want me to:
- **(A)** Execute all 7 clusters in this loop (≈74 route swaps + ~9 new static pages, large diff), or
- **(B)** Start with clusters 1–3 (Homeowner + Contractor + Condo — highest revenue impact) and queue the rest?
