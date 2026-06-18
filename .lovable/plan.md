
# Homepage A/B — Variante "Recommandation intelligente"

## Objectif
Créer une **deuxième page d'accueil** complète, indépendante de la home actuelle, avec un **A/B test** déterministe (50/50) pour mesurer la conversion vs la home actuelle. Reprend mot-à-mot le contenu fourni et le visuel de référence (dark hero + sections claires en dessous).

## Routing & A/B test

- Nouvelle route publique `/v2` → `PageHomeVariantB.tsx` (toujours accessible directement, utile pour previews internes & lien d'audit).
- Sur `/` (la home actuelle, `PageHomeSimple`) :
  - Au premier hit, un hook `useHomeAbTest()` assigne un bucket `A` ou `B` (50/50) basé sur `crypto.randomUUID()`, persiste dans `localStorage["unpro_home_ab"]` + cookie 90 j, lit `?variant=a|b` pour forcer un bucket (QA).
  - Bucket A → rend la home actuelle telle quelle.
  - Bucket B → rend `<PageHomeVariantB />` inline (pas de redirect, l'URL reste `/`, donc pas de pollution SEO ni de cassure de partage).
- Logging : `supabase.from("ab_test_assignments").insert({ test_key: "home_v1_vs_v2", bucket, visitor_id, path })` au premier mount, idempotent par visiteur. Réutilise la pattern `entrepreneur_cta_events` (insert fire-and-forget).
- Tous les CTA de la variante B taggent un `cta_key` préfixé `home_b_*` dans la même table d'events que la home actuelle utilise, pour comparer les taux.

## Structure de la variante B (mobile-first, fidèle à l'image)

Page = stack vertical, sections pleine largeur :

```
┌──────────────────────────────────────────────┐
│ HERO (dark, fond #050816 + glow bleu)        │
│  • H1: "Le meilleur entrepreneur n'est pas   │
│        toujours le plus visible."            │
│  • Sous-titre bleu + paragraphe              │
│  • CTAs: [Parler à Alex] [Créer mon          │
│          Passeport Maison]                   │
│  • Trust row: Gratuit · 100% confidentiel ·  │
│               Experts vérifiés               │
│  • Visuel droite (desktop): mosaïque         │
│    d'entrepreneurs floutés + carte           │
│    "Correspondance 96%" en avant             │
├──────────────────────────────────────────────┤
│ COMPARATEUR "NE RECOMMANDE PAS / RECOMMANDE" │
│  fond clair, 2 colonnes d'icônes ❌ vs ✅    │
├──────────────────────────────────────────────┤
│ "Comment UNPRO fonctionne" — 4 étapes        │
│  numérotées (1→2→3→4), cards claires         │
├──────────────────────────────────────────────┤
│ "Déjà reçu des soumissions ?" — dropzone     │
│  visuelle + 6 bullets en 2 colonnes          │
├──────────────────────────────────────────────┤
│ "Ce qui rend UNPRO différent" — 3 cards :    │
│  Annuaires / Plateformes / UNPRO (carte      │
│  dark mise en avant)                         │
├──────────────────────────────────────────────┤
│ "Un réseau d'entrepreneurs vérifiés" —       │
│  8 pastilles icônes (RBQ, assurances, …)     │
├──────────────────────────────────────────────┤
│ FAQ accordion (4 questions du brief)         │
├──────────────────────────────────────────────┤
│ CTA FINAL dark — photo maison nuit + cadre   │
│  bleu, CTA "Parler à Alex"                   │
└──────────────────────────────────────────────┘
```

Le contenu textuel est repris **mot-à-mot** depuis le brief utilisateur.

## Design

- Réutilise les tokens existants (`hero-gradient`, `text-gradient`, `shadow-glow`, `bg-primary/8`, `glass-strong`). Aucun hardcode couleur.
- Hero : section `dark` (wrapper `.alex-immersive` pour respecter la règle de lisibilité absolue) — fond cinematic, texte primary readable.
- Sections intermédiaires : fond clair `bg-background` (warm landing), respect du contraste WCAG AA.
- Carte "UNPRO" dans la section "Ce qui rend UNPRO différent" : variante dark avec ring `--primary` et glow.
- Animations : `framer-motion` léger (fade-up échelonné), respect `prefers-reduced-motion`. Pas d'effets agressifs.
- Mobile : sections empilées, CTAs pleine largeur, sticky bottom CTA bar réutilisable (réutilise pattern de `StickyMobileCTAV2`).

## Garde-fous mémoire / produit

- **Note du fondateur** : la variante B doit aussi respecter le gating philosophie (FounderNoteConsent) — placée entre hero et comparateur, comme sur la home actuelle. Confirmé via la mémoire.
- **Positionnement** : on évite les formules interdites ("marketplace d'entrepreneurs", "trouvez un entrepreneur de confiance"). Le contenu fourni est déjà aligné ("recommande le meilleur entrepreneur pour votre situation"), je le garde tel quel.
- **Pas de model "3 soumissions"** : le contenu fourni *critique* le modèle 3 soumissions, donc cohérent avec la doctrine.
- **fr-CA** : ponctuation, espaces avant `?` `!` `:`, pas d'apostrophes droites dans la copy.
- **Lisibilité** : wrap dark sections dans `.alex-immersive`, jamais `text-gray-*` direct, opacités ≥ 70 % sur texte.

## Fichiers à créer

- `src/pages/home/PageHomeVariantB.tsx` — page complète.
- `src/components/home-variant-b/HeroVariantB.tsx`
- `src/components/home-variant-b/SectionContrastVariantB.tsx` (NE RECOMMANDE PAS / RECOMMANDE)
- `src/components/home-variant-b/SectionHowItWorksVariantB.tsx`
- `src/components/home-variant-b/SectionQuoteAnalysisVariantB.tsx`
- `src/components/home-variant-b/SectionDifferentiationVariantB.tsx`
- `src/components/home-variant-b/SectionVerifiedNetworkVariantB.tsx`
- `src/components/home-variant-b/SectionFaqVariantB.tsx`
- `src/components/home-variant-b/SectionFinalCtaVariantB.tsx`
- `src/components/home-variant-b/StickyMobileCtaVariantB.tsx`
- `src/hooks/useHomeAbTest.ts` — assignation + persistance + logging.
- `supabase/migrations/<ts>_home_ab_test_assignments.sql` — table `ab_test_assignments` (visitor_id, test_key, bucket, path, created_at) + GRANTs + RLS (insert anon OK, select restreint au service_role/admin).

## Fichiers modifiés

- `src/pages/home/PageHomeSimple.tsx` (ou équivalent monté sur `/`) — wrap dans `useHomeAbTest()` et switch A/B.
- `src/app/router.tsx` + `src/config/routesConfig.ts` — enregistrer `/v2` lazy-loaded, public, SEO `noindex` (juste pour le QA direct, le test live se fait sur `/`).

## Hors scope

- Pas de dashboard admin pour le test (les events sont déjà queryables via `/admin/operations` ou Supabase SQL).
- Pas de modification de la home actuelle au-delà du switch A/B.
- Pas de nouvelle logique Alex / backend / matching.
