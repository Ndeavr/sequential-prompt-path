# Homepage Variant C (`/v3`) — "Le bon entrepreneur"

## Objectif
Créer une 3e homepage (Variant C) qui vend l'idée AVANT d'expliquer. Style Apple/OpenAI : héros minimal, preuves immédiates, bombe entrepreneur, dual CTA final. Intégrer dans le A/B test existant (3 buckets : A=Unicorn, B=Recommandation, C=LeBon).

## Structure de la page (mobile-first, dark premium)

1. **Hero ultra-minimal** (dark, image maison + 20 entrepreneurs flous + 1 illuminé + badge "Correspondance 97%")
   - H1 : "Trouvez le **bon** entrepreneur."
   - Sous-titre : "Pas le plus visible. Pas le moins cher. **Le bon.**"
   - CTA unique : `Parler à Alex` (réponse en 2 minutes)
   - **PAS** de section "L'IA ne recommande pas / recommande" en haut

2. **"Pourquoi cet entrepreneur ?"** — 6 badges icônes (fond clair)
   - RBQ vérifiée · Assurances vérifiées · Spécialité compatible · Budget compatible · Disponibilité compatible · Performance vérifiée

3. **"Pourquoi comparer 3 soumissions ?"** — visuel narratif
   - 3 cartes soumissions (18 450 $ / 24 780 $ / 15 320 $) → flèche → noeud IA → flèche → 1 recommandation 5★

4. **Section Entrepreneur** (fond bleu sombre légèrement différencié)
   - "Les propriétaires demandent déjà à l'IA quel entrepreneur choisir."
   - "Votre entreprise ferait-elle partie des recommandations ?"
   - Mockup téléphone montrant la conversation Alex
   - CTA : `Activer mon profil`

5. **La bombe : "Ce que voit le propriétaire"**
   - Mockup chat Alex Q/R
   - Q : "Quel entrepreneur me recommandez-vous pour refaire ma toiture à Laval ?"
   - R : ✅ Entreprise recommandée + 4 puces (RBQ, Spécialiste toiture, Dispos cette semaine, Performance vérifiée)

6. **CTA final dual 50/50**
   - Gauche (propriétaire bleu) : "Trouvez le bon entrepreneur." → `Commencer`
   - Droite (entrepreneur noir) : "Êtes-vous déjà recommandable par l'IA ?" → `Activer mon profil`

7. **Footer minimal** : logo UNPRO + "L'IA au service de meilleures décisions." + unpro.ca

## A/B test étendu à 3 buckets

- `useHomeAbTest.ts` : étendre de `'a' | 'b'` à `'a' | 'b' | 'c'` (split 33/33/33, override `?variant=a|b|c`)
- `HomeAbSwitch.tsx` : ajouter case `'c'` → `PageHomeVariantC`
- Route directe `/v3` pour QA (noindex, lazy)
- Tous les CTA loggent dans `entrepreneur_cta_events` avec préfixe `home_c_*`

## Fichiers à créer

- `src/pages/home/PageHomeVariantC.tsx`
- `src/components/home-variant-c/HeroLeBon.tsx`
- `src/components/home-variant-c/SectionWhyThisContractor.tsx` (6 badges)
- `src/components/home-variant-c/SectionWhyCompare3Quotes.tsx` (narratif 3→IA→1)
- `src/components/home-variant-c/SectionContractorPitch.tsx`
- `src/components/home-variant-c/SectionWhatHomeownerSees.tsx` (la bombe chat)
- `src/components/home-variant-c/SectionDualCtaFinal.tsx`
- `src/assets/home-v3-hero.jpg` (généré : maison + 20 entrepreneurs flous + 1 illuminé)

## Fichiers à modifier

- `src/hooks/useHomeAbTest.ts` — étendre à 3 buckets
- `src/components/home-ab/HomeAbSwitch.tsx` — ajouter bucket C
- `src/app/router.tsx` — ajouter route `/v3` lazy

## Design tokens (réutilisés, zéro nouveau)
- Dark cinematic (`#050816` base + glow primaire/accent), hero-gradient, `text-gradient`, `shadow-glow`
- Wrap dark sections dans `.alex-immersive` pour lisibilité
- Sticky bottom CTA réutilisé (mobile)
- Caveat NON utilisé (réservé Founder Note variant A)
- `prefers-reduced-motion` respecté

## Hors scope
- Aucun changement backend, matching, Alex prompts
- Aucun nouveau secret, edge function ou migration
- Aucun changement aux variants A et B
- Aucun admin dashboard A/B/C (réutilise table existante `ab_test_assignments`)

## Critères de succès
- `/v3` accessible directement, rendu mobile sans scroll horizontal
- Bucket C assigné ~33% des nouveaux visiteurs sur `/`
- Événements `home_c_*` loggés dans Supabase
- Build vert, aucune régression sur `/` et `/v2`
