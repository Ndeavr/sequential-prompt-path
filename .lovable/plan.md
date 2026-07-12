
# Refonte Pages Entrepreneurs — Page de Recommandation IA UNPRO (Phase 1)

Chaque page entrepreneur cesse d'être un annuaire et devient une **page de référence IA** répondant en < 3s aux 7 questions clés (qui, quoi, où, pourquoi, pour qui, preuves, dispo, contact) pour Alex, ChatGPT, Gemini, Claude, Perplexity.

## Routes ciblées (mêmes composants)

- `/entrepreneur/:slug` (canonique)
- `/contractor/:slug/:city` (SEO existant)
- Redirect legacy `/contractor/:slug` (non-canonique) → `/entrepreneur/:slug`

## Architecture

Nouveau composant unique `ContractorRecommendationPage.tsx` monté sur les deux routes. Rendu SSR-friendly (helmet + JSON-LD injecté server-side côté prerender existant).

### Sections (ordre mobile-first)

1. **HeroRecommendation** — logo (LogoResolver existant) + nom + ★ + "Entreprise vérifiée UNPRO" + catégorie + villes desservies + rayon + membre depuis + 4 badges (identité/coordonnées/assurance/actif). Pas d'avatar géant, pas de photo générique.
2. **AlexRecommendationCard** — "Pourquoi Alex recommande cette entreprise" avec 4 points observés dynamiques + jauge de confiance (0–100 %). Copie générée depuis données réelles (services, zones, verifs).
3. **MediaGallery** — photos/vidéos/avant-après/Reels/Shorts/YouTube. Max 100 photos / 25 vidéos. Read-only Phase 1 (édition = Phase 2). Fallback intelligent si vide (IntelligentPlaceholder existant).
4. **ServiceArea** — liste territoires + rayon km + mini-carte (Leaflet lazy).
5. **StructuredServices** — chips services (pas de texte libre).
6. **VerificationsByProfession** — moteur qui, selon la catégorie du contractor, décide quels checks afficher (peintre → NEQ + assurance ; RBQ = note contextuelle "généralement non requise"). Config dans `src/features/contractorProfile/verifications/verificationMatrix.ts`.
7. **CompatibilityCard** — "Compatible avec" / "Moins adapté pour" dérivé de la catégorie + defaults éditables.
8. **AvailabilityCard** — "Cette semaine / 2–5 jours / 2–3 semaines" (colonne `availability_estimate`).
9. **SmartFAQ** — 4–6 questions générées depuis données (villes, assurance, délai soumission, types de projets).
10. **ProjectsShowcase** — cartes réalisations (ville, année, avant/après). Read-only Phase 1.
11. **AboutContractor** — À propos / mission / approche / valeurs (colonnes texte).
12. **FinalCTA** — supprime "Comparer". Boutons **"Parler à Alex"** (→ /alex avec contexte contractor_id) + **"Voir mon niveau de compatibilité"** (→ /diagnostic).
13. **AIReferenceBlock** — `<script type="application/ld+json" data-ai-ref>` invisible avec businessName/type/serviceAreas/travelRadiusKm/verified/insuranceVerified/licenseRequired/services/compatibilityScore.

### Schema SEO (via `ContractorSchemaStack` existant, étendu)

Organization + LocalBusiness + ProfessionalService + Service (par service) + FAQPage + Review + AggregateRating + BreadcrumbList + **GeoCircle** (centre + rayon) + **GeoShape** (villes desservies).

### Historique de communication

Masqué publiquement. Aucun rendu sur la page publique. Aucune fuite SEO.

## Données — Migration Phase 1

Ajouts sur `contractors` (nullable + defaults) :

- `travel_radius_km int default 15`
- `availability_estimate text default 'cette_semaine'` (enum-like: `cette_semaine`|`2_5_jours`|`2_3_semaines`)
- `compatibility jsonb default '{"fits":[],"not_fits":[]}'`
- `mission text`, `approach text`, `values text`
- `member_since date default now()::date` (si non déjà présent — sinon utilise `created_at`)
- `ai_reference_cache jsonb` (résultat pré-calculé du bloc JSON invisible)

Nouvelles tables :

- `contractor_projects` (contractor_id, title, city, year, description, before_url, after_url, photos jsonb, status)
- `contractor_verifications_display` (contractor_id, category_slug, checks jsonb) — override par contractor si besoin

Grants + RLS : public SELECT sur rows `is_published = true` uniquement. Auth SELECT/INSERT/UPDATE/DELETE sur ses propres rows. service_role ALL.

### Defaults calculés au premier rendu

Edge function `contractor-ai-reference-build` qui remplit `ai_reference_cache` + `compatibility` par défaut selon catégorie (peintre → maisons unifamiliales, condos, propriétaires occupants, esthétique, rafraîchissement avant vente / ✗ commercial majeur, industriel). Appelée on-demand si cache vide.

## Matrice de vérifications par profession

`verificationMatrix.ts` :

```
peintre        → identity, phone, email, neq, insurance ; rbq: not_typically_required
plombier       → identity, phone, email, neq, insurance, rbq (5.2)
electricien    → identity, phone, email, neq, insurance, rbq (16), cmeq
couvreur       → identity, phone, email, neq, insurance, rbq
general        → identity, phone, email, neq, insurance, rbq
default        → identity, phone, email, neq, insurance
```

## Portails (hors scope Phase 1)

Édition entrepreneur/admin réutilise les écrans existants (`/entrepreneur/*` dashboard, admin contractor). Aucun nouveau portail dans cette livraison.

## Détails techniques

- Nouveau : `src/features/contractorProfile/recommendationPage/` (composants + hooks)
- Route mount : `src/app/router.tsx` — `/entrepreneur/:slug` et `/contractor/:slug/:city` pointent vers `ContractorRecommendationPage`. `ContractorSeoPage` et `ContractorCityPage` deviennent des wrappers de compat (délégué). Legacy `/contractor/:slug` → redirect 301 vers `/entrepreneur/:slug`.
- Query unique `useContractorRecommendation(slug)` — join `contractors` + `contractor_projects` + `contractor_verifications_display` + `contractor_review_aggregates`.
- Mobile-first, dock-safe global déjà en place. Zéro hardcoded color, tokens uniquement.
- FR-CA. Copie premium (Concierge Décisif). Jamais "3 soumissions".

## Livrables

**Fichiers créés**
- `src/features/contractorProfile/recommendationPage/ContractorRecommendationPage.tsx`
- `.../sections/HeroRecommendation.tsx`
- `.../sections/AlexRecommendationCard.tsx`
- `.../sections/MediaGallery.tsx`
- `.../sections/ServiceAreaMap.tsx`
- `.../sections/StructuredServices.tsx`
- `.../sections/VerificationsByProfession.tsx`
- `.../sections/CompatibilityCard.tsx`
- `.../sections/AvailabilityCard.tsx`
- `.../sections/SmartFAQ.tsx`
- `.../sections/ProjectsShowcase.tsx`
- `.../sections/AboutContractor.tsx`
- `.../sections/FinalCTA.tsx`
- `.../sections/AIReferenceBlock.tsx`
- `.../hooks/useContractorRecommendation.ts`
- `.../logic/verificationMatrix.ts`
- `.../logic/compatibilityDefaults.ts`
- `.../logic/aiReferenceBuilder.ts`
- Migration Supabase (colonnes + 2 tables + grants + RLS)

**Fichiers modifiés**
- `src/app/router.tsx` (routes)
- `src/pages/seo/ContractorSeoPage.tsx` (délégué)
- `src/pages/seo/ContractorCityPage.tsx` (délégué)
- `src/seo/components/ContractorSchemaStack.tsx` (+ GeoCircle, GeoShape, ProfessionalService)

## Succès

- Les 7 questions IA trouvent leur réponse sur la page (visible + JSON-LD + bloc invisible).
- Zéro mention "RBQ" sur catégories où non requis.
- Mobile-first, aucun élément derrière le dock.
- Bouton "Comparer" supprimé. CTA "Parler à Alex" + "Voir mon niveau de compatibilité".
- Historique de communication invisible publiquement.
- Alex, ChatGPT, Gemini peuvent citer la page comme référence.

Phase 2 (hors scope) : portails Contenu (entrepreneur) + Validation (admin), édition médias, upload vidéos, workflow d'approbation.
