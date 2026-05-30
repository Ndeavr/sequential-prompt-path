## Correction homepage mobile — Carousel 4 cartes

### Contexte
La home (`src/pages/PageHomeUnicorn.tsx`) affiche actuellement une grille compacte 4-cols `HomeQuickActionsGrid` (8 items) qui a remplacé les 2 grandes cartes "Téléverser une photo" / "Analyser une soumission". L'utilisateur veut **restaurer** le format des 2 grandes cartes et **les étendre à 4** via un carousel horizontal premium type Apple Wallet / Tesla.

### Livrable
Remplacer `HomeQuickActionsGrid` par un nouveau composant `HomeActionsCarousel` rendant 4 cartes dans un scroll horizontal snap.

### Cartes (ordre exact)
| # | Label | Sous-texte | Icône | Route |
|---|---|---|---|---|
| 1 | Diagnostic visuel IA | Analyse IA instantanée | `ImageIcon` (bleu) | `/diagnostic-visuel` |
| 2 | Analyser 3 soumissions | Comparez vos devis | `FileText` (bleu) | `/analyse-soumissions` |
| 3 | Vérifier un entrepreneur | RBQ, avis, fiabilité | `ShieldCheck` (vert) | `/verifier-entrepreneur` |
| 4 | Imaginez un décor | Studio design IA | `Sparkles` (violet) | `/design-ai` |

Routes 3 et 4 : on garde les chemins demandés tels quels (si la route n'existe pas, le routeur affichera la 404 existante — non bloquant pour cette tâche UI).

### Comportement carousel
- Container : `flex overflow-x-auto snap-x snap-mandatory uc-no-scrollbar` + `scroll-padding-left: 16px`
- Padding latéral 16px + `gap-3`
- Chaque carte : `snap-start shrink-0`, largeur `w-[78vw] max-w-[300px]`, hauteur **uniforme** `h-[108px]`
- `-webkit-overflow-scrolling: touch` pour inertie iOS
- Scrollbar masquée (classe existante `uc-no-scrollbar`)
- Tap feedback : `active:scale-[0.98] transition-transform`
- Desktop (`md:`) : bascule en `grid grid-cols-4 gap-3` (pas de scroll)

### Style cartes (cohérent design system UNPRO)
- `uc-glass-strong` + `rounded-[22px]` + ombre douce existante
- Layout interne : icône 40×40 dans pastille colorée à gauche, titre 14px semi-bold + sous-texte 11px muted à droite, chevron `›` discret
- Titres en 2 lignes max avec `line-clamp-2`, sous-texte 1 ligne `truncate`
- Aucune carte plus haute (`h-[108px]` fixe sur toutes)

### Fichier touché
- `src/pages/PageHomeUnicorn.tsx` : remplacer `QUICK_ACTIONS` + `HomeQuickActionsGrid` par `ACTIONS_CAROUSEL` + `HomeActionsCarousel`. L'appel dans le JSX (ligne 507) reste identique en nom.

### Hors scope
- Pas de création des pages cibles `/diagnostic-visuel`, `/verifier-entrepreneur`, `/design-ai` (UI only — routes à créer ultérieurement si manquantes).
- "Parler avec Alex" CTA conservé tel quel au-dessus.
- Stats live + catégories chips inchangés.

### Critères de succès
- 4 cartes visibles en swipe horizontal sur 384px sans overflow ni texte coupé
- Snap par carte, scrollbar invisible, 60fps
- Hauteur uniforme, glassmorphism cohérent
- Desktop = grid 4 colonnes propre