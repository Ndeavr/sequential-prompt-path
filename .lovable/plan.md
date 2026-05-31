# Vérification interactive — Search-first + Extrapolation chain

## Problème
`/verifier-entrepreneur` (`VerifyLandingPage`) est aujourd'hui une longue page SEO. Le champ de recherche est noyé. Quand on tape, on est redirigé vers `/verifier-un-entrepreneur` (autre page) qui demande de remplir un mini-formulaire à 5 champs avant de lancer la vérif. Le user veut **une seule page interactive** : on tape → on voit des résultats probables (style Google) → on clique → l'extrapolation s'enchaîne en direct (RBQ, NEQ, avis).

## Objectif
1. Recherche immédiate et visible en haut de page (mobile-first).
2. Liste de "résultats probables" inline (Google Places) si pas certain à 100%.
3. Au clic sur un résultat, **rester sur la page** et dérouler une timeline live :
   - Google Business (nom, adresse, téléphone, site, note, nb avis)
   - RBQ (cross-lookup par nom + ville + téléphone)
   - NEQ (cross-lookup par nom légal)
   - Analyse des avis (sentiment, volume, signaux de risque)
4. CTA final unique : verdict + "Réserver via Alex" / "Voir le rapport complet".

## Architecture

### Pages / routes
- `/verifier-entrepreneur` → refonte vers **mode interactif** (search-first).
- `/verifier-un-entrepreneur` (page formulaire détaillé) → reste pour les cas avancés (RBQ direct, upload soumission) accessible via "Vérification avancée".
- Contenu SEO long (FAQ, "ce qu'on vérifie", "ce qu'on ne fait pas") → conservé mais déplacé **sous** la zone interactive, scroll naturel.

### Composants
- `HeroBusinessVerifySearch` → modifié : au lieu de `navigate(...)` au clic, émet `onPick(result)` au parent.
- Nouveau `InteractiveVerificationConsole` (orchestrateur sur la page) :
  - état: `idle | searching | picking | extrapolating | done`
  - rend la timeline `ExtrapolationTimeline`.
- Nouveau `ExtrapolationTimeline` (4 étapes animées, framer-motion, glass cards) :
  1. **Google Business** — utilise déjà les champs renvoyés par `business-lookup` (nom, ville, téléphone, site, rating, review_count, place_id).
  2. **Licence RBQ** — invoque `aipp-verify-rbq` (edge fn existante) avec `{business_name, city, phone}`. Affiche statut, sous-catégories, validité.
  3. **NEQ** — invoque `aipp-verify-neq` (edge fn existante) avec `{business_name}`. Affiche statut, nom légal, date enregistrement.
  4. **Analyse des avis** — invoque `verify-contractor` ou nouvelle fn `verify-reviews-analysis` qui résume rating + count + 3 signaux (volume, fraîcheur, ratio négatifs) via Lovable AI Gateway (modèle `google/gemini-2.5-flash`).
- `VerdictSummaryCard` final : `succes | attention | non_succes | se_tenir_loin` + CTA Alex.

### Logique extrapolation
- Lancée en parallèle dès le pick (Promise.allSettled sur RBQ + NEQ + reviews).
- Chaque étape passe `pending → loading → ok | empty | error` indépendamment (jamais bloquant).
- Si Google ne renvoie qu'un résultat sur la recherche initiale → auto-pick et démarre direct.
- Si plusieurs résultats → liste affichée, message "On a trouvé X entreprises probables, choisissez la bonne".
- Si zéro résultat → fallback : bouton "Vérification avancée" qui ouvre un panneau inline avec RBQ / téléphone / site web.

### Données
- Aucune nouvelle table. Réutilise `verification_runs` existant (la run est créée à la fin via `useVerifyContractor` avec form pré-rempli par l'extrapolation).
- Logge `system_events` type `verification.interactive_pick` + `verification.extrapolation_done`.

### Edge functions
- Réutilise : `business-lookup`, `aipp-verify-rbq`, `aipp-verify-neq`, `verify-contractor`.
- Nouvelle (légère, optionnelle si déjà couverte) : `verify-reviews-analysis` — appelle Lovable AI Gateway pour produire `{sentiment, volume_tier, recency_tier, red_flags[]}` à partir du `place_id` + données Google Places (note, count). Si la fn existante `verify-contractor` couvre déjà les avis, on s'en sert.

## UI/UX
- Mobile-first, première fold = champ recherche XL + sous-titre court.
- Suggestions inline (déjà fait), max 6 résultats avec note + ville.
- Timeline verticale, chaque étape :
  - icône, label, état (skeleton pulse pendant loading, ✓ vert, ⚠ ambre, ✗ rouge)
  - payload résumé (1–3 lignes max)
  - "voir détails" expand
- Verdict final = card glass premium avec score ring + 1 CTA primaire ("Réserver via Alex") + 1 secondaire ("Rapport complet PDF").
- Contenu SEO (FAQ, etc.) déplacé sous le verdict, accessible au scroll.

## Tâches
1. Refactor `HeroBusinessVerifySearch` : ajouter prop `onPick(result, query)` optionnelle ; conserver navigate comme fallback.
2. Créer `src/components/verify/InteractiveVerificationConsole.tsx` (orchestrateur + state machine).
3. Créer `src/components/verify/ExtrapolationTimeline.tsx` + sous-composant `TimelineStep`.
4. Créer `src/services/verification/extrapolationOrchestrator.ts` (Promise.allSettled wrapper appelant les 3 edge fns).
5. Créer si nécessaire `supabase/functions/verify-reviews-analysis/index.ts` (Lovable AI Gateway, `google/gemini-2.5-flash`).
6. Refondre `VerifyLandingPage` : hero compact + `<InteractiveVerificationConsole />` immédiat, sections SEO conservées sous le pli.
7. Logger événements via `system_events`.

## Hors scope
- Pas de nouvelle table SQL.
- Pas de changement de routing (`/verifier-un-entrepreneur` reste pour mode avancé).
- Pas de refonte du engine de vérification existant (`verify-contractor`).
