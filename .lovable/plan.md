# Plan — AIPP Universal Entity Template + ISR Demo

## Objectif
Transformer chaque entrepreneur en **entité structurée vérifiable et citable par les IA** (ChatGPT, Gemini, Perplexity). Page modèle réutilisable sur 10 000+ profils, avec JSON-LD complet, preuves vérifiées, et zéro invention.

## Architecture

```
/aipp/:slug              → Page publique AIPP (template universel)
/admin/aipp-import       → Centre d'import + validation
/admin/aipp-profiles     → Liste / modération profils
```

Route démo : `/aipp/isolation-solution-royal`

## Phase 1 — Schéma Supabase (migration unique)

Tables :
- `aipp_profiles` — identité + statut publication
- `aipp_profile_sources` — URL source de chaque fait (traçabilité)
- `aipp_profile_services` — taxonomie normalisée (service, sous-services, problèmes, saisonnalité, urgence, valeur projet, client idéal)
- `aipp_profile_locations` — villes desservies (génération contenu local)
- `aipp_profile_media` — photos, vidéos, avant/après, alt SEO auto
- `aipp_profile_reviews` — avis + résumé IA + forces/points faibles
- `aipp_profile_validations` — RBQ, NEQ, assurance, NAP, GBP (statut: confirmed / unverified / not_found + source)
- `aipp_profile_scores` — AIPP, trust, SEO, AI citation, NAP, review, media
- `aipp_entity_facts` — bloc invisible « facts » lisible par IA
- `aipp_schema_snapshots` — JSON-LD versionné par profil
- `aipp_import_runs` — historique scrape + diagnostics

RLS :
- Public : lecture si `public_status = 'published'`
- Admin : full CRUD via `has_role(admin)`
- Contractor : peut demander correction sur son profil lié (table `aipp_profile_corrections`)
- Documents privés : aucune lecture publique

## Phase 2 — Page publique `/aipp/:slug`

Composant `PageAippProfile` + sections modulaires :

1. **HeroAipp** — Logo, nom, métier, ville, badge « Profil IA vérifié UNPRO », score AIPP, score confiance, note Google, 3 CTA (Vérifier / RDV / Analyser soumissions)
2. **AippAiSummary** — Résumé IA des sources analysées
3. **AippVerifiedData** — Table 10 lignes (Confirmé / À confirmer / Non trouvé) avec icône + source
4. **AippServicesGrid** — Services normalisés (taxonomie UNPRO)
5. **AippServiceAreas** — Carte + villes (contenu local unique par ville)
6. **AippGallery** — Photos + alt SEO auto + avant/après slider
7. **AippVideoBlock** — Vidéo + transcript + résumé IA
8. **AippReviewsSummary** — Résumé IA + forces + extraits
9. **AippScoreBreakdown** — Score sur 100 avec 10 sous-dimensions
10. **AippWhyRecommend** — « Profil compatible » (jamais « meilleur »)
11. **AippFaqIa** — 6 Q/R optimisées AEO
12. **AippEntityFacts** — Bloc `<div hidden>` lisible IA avec faits propres

**SEO/AEO** :
- `react-helmet-async` : title, description, canonical, OG, Twitter
- `SchemaStack` injecte JSON-LD : LocalBusiness, HomeAndConstructionBusiness, Contractor, Service, OfferCatalog, Review, AggregateRating, FAQPage, BreadcrumbList, ImageObject, VideoObject, Organization, WebPage, SpeakableSpecification
- Sitemap : route `aipp-sitemap` edge function listant tous les profils published
- robots: index, follow

## Phase 3 — Score AIPP

Service `src/services/aippEntityScoreService.ts` :
- 10 dimensions × 10 pts = 100
- Présence web, NAP, avis, photos, autorité locale, structure IA, preuves, spécialisation, citabilité ChatGPT, citabilité Gemini/Perplexity
- Score recalculé à chaque update profil + stocké dans `aipp_profile_scores`

## Phase 4 — Admin Import Center `/admin/aipp-import`

Edge function `aipp-import-website` :
- Input : URL site
- Firecrawl scrape (markdown + links + branding + images)
- Lovable AI Gateway (Gemini 3 Flash) → extraction structurée via tool calling :
  - nom légal/commercial, téléphone, courriel, RBQ/NEQ, services, villes, Google Business
- Génère : résumé IA, FAQ, alt text images, JSON-LD complet
- Calcule score AIPP, diagnostique données manquantes
- Sauvegarde dans `aipp_import_runs` + populate `aipp_profiles` (draft)

UI admin :
- Input URL → bouton « Scraper »
- Preview de chaque champ détecté avec statut (confirmé/à confirmer)
- Boutons : « Publier », « Demander validation entrepreneur », « Recalculer score »
- Liste des runs précédents

## Phase 5 — Démo ISR (Isolation Solution Royal)

Seed via migration :
- Profile published avec :
  - Site : isroyal.ca
  - Services : isolation entretoit, décontamination moisissure, ventilation soffites, étanchéité air, inspection entretoit
  - Zones : Terrebonne, Laval, Montréal, Rive-Nord, Lanaudière
  - Positionnement : spécialiste entretoit résidentiel, inspection gratuite
- **Sans inventer** RBQ/assurance/note → marqués `not_found` ou `unverified`
- Photos placeholder (à remplacer par scrape réel)
- JSON-LD complet généré + validé

## Détails techniques

- Frontend : React + Vite + TanStack Query, `react-helmet-async` déjà installé
- AI : Lovable AI Gateway, model `google/gemini-3-flash-preview` (extraction) et `google/gemini-2.5-pro` (résumé long)
- Scrape : Firecrawl (connector existant) — formats `markdown`, `links`, `branding`, `screenshot`
- Edge functions Deno : `aipp-import-website`, `aipp-generate-summary`, `aipp-compute-score`, `aipp-sitemap`
- Réutilise : `SchemaStack`, `SeoHead`, `SeoFaqSection`, `SeoStructuredDataInjector`, `seoSchema.ts`
- Conformité memory : SECURITY INVOKER pour views publiques, fr-CA strict, dark cinematic pour app et warm neutral pour `/aipp/:slug` (page publique SEO)

## Hors-scope (phase suivante)
- Comparatif multi-entrepreneurs
- Flow contractor « réclamer mon profil » complet (UI seulement, pas auth flow)
- Auto-scrape récurrent (cron)

## Question avant build
Confirmes-tu : **page publique `/aipp/:slug` en thème Warm Neutral** (cohérent avec landing SEO publique) et **import admin sous `/admin/aipp-import` en Cinematic Dark** ?
