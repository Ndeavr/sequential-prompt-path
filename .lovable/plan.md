# Logo UNPRO — un seul composant canonique, zéro cercle « U »

## Constat vérifié

Le composant canonique existe déjà : `src/components/brand/UnproLogo.tsx` / `UnproIcon.tsx`, alimentés par `src/config/branding.ts` (wordmark, carré, rond officiels sur CDN). `SmartHeader` et `SmartFooter` l'utilisent correctement. Aucun nouveau logo ni nouveau composant ne sera créé.

Les surfaces fautives repérées dans le code actuel :

| Surface | Marque affichée aujourd'hui |
|---|---|
| `src/pages/PropertyGraphPage.tsx` (Passeport / graphe) | carré bleu avec la lettre « U » + texte « UNPRO » |
| `src/layouts/DashboardLayout.tsx` (sidebar + header mobile propriétaire) | pastille dégradée avec icône `Sparkles` + texte |
| `src/layouts/ContractorLayout.tsx` | idem `Sparkles` |
| `src/layouts/AdminLayout.tsx` | idem `Sparkles` |
| `src/layouts/CondoLayout.tsx` | pastille `Building2` + texte |
| `src/components/navigation/DrawerNavigationMobileIntent.tsx` | texte « UNPRO » seul, sans marque |
| `src/components/matching/MatchCard.tsx` | badge « U » comme icône du score UNPRO |

À ne pas toucher (avatars légitimes, pas la marque UNPRO) : `CompanyIdentityHeader`, `LogoResolver` / `MonogramBadge` (entrepreneurs), `DashHero`, `PageAiIndexedProfile`.

## Ce qui change

1. **Passeport Maison / Property Graph** (`PropertyGraphPage`)
   - Le bloc « [U] UNPRO » est remplacé par `<UnproLogo showWordmark />` cliquable vers `/`, hauteur contrôlée (~28 px), sans compresser le header.
   - Le texte de droite « Property Knowledge Graph » devient « Passeport Maison UNPRO » sur desktop et est masqué sous `sm`.
   - Le H1 devient « Passeport Maison » avec la mention technique du graphe reléguée en sous-titre — le propriétaire voit un langage clair, la page garde son contenu.

2. **Layouts (propriétaire, entrepreneur, admin, condo)**
   - Les pastilles `Sparkles` / `Building2` sont remplacées par le logo officiel : wordmark dans les sidebars et l'en-tête mobile, marque ronde seule là où la largeur est contrainte. Les qualificatifs existants (« Admin », « Espace Pro », « Condos ») sont conservés en texte secondaire à côté du logo, sans doublon du mot « UNPRO ».

3. **Drawer mobile** : le titre texte devient le vrai logo.

4. **MatchCard** : le badge « U » du score UNPRO devient la marque ronde officielle à la même taille (20 px), sans changer la donnée affichée.

5. **Fallback anti-« U »** : `UnproLogo` / `UnproIcon` reçoivent un `onError` qui bascule d'abord sur une autre variante officielle (wordmark → rond), puis, en dernier recours, sur le mot « UNPRO » composé proprement. Jamais d'avatar ni d'initiale générée.

## Vérification

Passage Playwright sur `/property-graph`, `/proprietaires/passeport-maison`, `/dashboard`, un écran entrepreneur, `/admin` et `/condos`, en 320 / 375 / 390 / 430 px, tablette et desktop, thèmes clair et sombre : aucun débordement, logo non écrasé, aucune duplication de marque. Recherche finale sur le code pour confirmer qu'aucun cercle/carré à lettre ne représente encore UNPRO.

## Détails techniques

Modifications limitées à la présentation : aucun changement de logique métier, de données ou de routes. Aucun nouvel asset, aucun nouveau composant de marque — uniquement des remplacements par `UnproLogo` / `UnproIcon` et l'ajout du fallback en cascade dans ces deux fichiers.
