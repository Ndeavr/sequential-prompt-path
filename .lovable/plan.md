## Objectif

Aligner la home sur la référence (image 1) :
- 6 cartes égales en grille 3×2, blanches, avec **"Trouver un pro"** ET **"Recommander un professionnel"** côte à côte (pas de carte vedette bleue pleine largeur).
- Background blanc/glace premium MAIS avec maison blueprint + knowledge graph **clairement perceptibles** derrière l'orb (actuellement quasi invisibles).

## 1. `AlexCapabilitiesStrip.tsx` — retour à la grille 3×2

Supprimer la carte vedette bleue pleine largeur. Définir 6 capabilities dans un seul array, rendues en `grid-cols-3 gap-2` (sur mobile small : `grid-cols-2` fallback si overflow — référence montre 3 colonnes même sur mobile étroit).

Ordre (image 1) :
1. Comprendre un problème (HelpCircle)
2. Analyser une photo (Camera)
3. Estimer un coût (Calculator)
4. Comparer une soumission (FileCheck)
5. Trouver des subventions (BadgePercent)
6. Recommander un professionnel (UserCheck)

Carte type : fond blanc `#FFFFFF`, radius 18, ombre douce, icône bleue 22px dans un cercle `#EFF6FF`, titre 2 lignes `#0B1220` bold 12.5px, flèche `→` bleue alignée en bas à droite. Toutes identiques — aucune n'est mise en avant.

Ajouter au-dessus le gros CTA "Parler à Alex" (déjà présent dans le hero — vérifier qu'il existe, sinon le garder tel quel ; ce n'est pas dans le scope de ce composant).

## 2. Background — rendre la maison + knowledge graph visibles

Le problème actuel : après désaturation du thème, les couches `LayerHouseBlueprintGhost` (opacity 0.06) et `HousingKnowledgeGraph` (opacity 0.07) sont trop faibles pour être perçues. La référence montre une maison ligne fine bien lisible et un réseau de nœuds derrière l'orb.

Calibrer **uniquement les overlays hero** (pas les orbes flous) :

- `LayerHouseBlueprintGhost.tsx` : opacity `0.06` → **0.14**, stroke `#3B82F6` (garder), strokeWidth +20%. Positionné derrière l'orb (right side).
- `overlays/HousingKnowledgeGraph.tsx` : opacity `0.07` → **0.18**, nœuds r légèrement plus gros, lignes plus contrastées (`rgba(59,130,246,0.35)` au lieu de 0.20).
- `LayerDotIntelligenceField.tsx` : opacity `0.08` → **0.12** (le pointillé en coin doit se voir).
- `LayerHousingMesh.tsx` : opacity `0.05` → **0.09**.
- `LayerNeuralGlow.tsx` : halo derrière l'orb `0.22` → **0.30** (plus présent mais reste local).
- `LayerGradientField` + `unicorn-theme.css` : **inchangés** (la base reste blanche/glace).
- `LayerFloatingDataOrbs` : **inchangés** (déjà calibrés bas).

Règle : le fond GLOBAL reste blanc 80%, mais la **zone hero droite** (autour de l'orb) doit raconter visuellement maison → réseau → intelligence. Test : screenshot sans texte/orb → la maison blueprint et le knowledge graph doivent être perceptibles sans effort, sans dominer la page.

## 3. Validation

Screenshot mobile 384px : 
- 6 cartes égales 3×2 visibles, "Trouver un pro" et "Recommander un professionnel" présents.
- Background blanc cassé avec maison blueprint + nodes visibles derrière l'orb.
- Texte noir parfaitement lisible.

## Hors scope

Pas de changement de copy, de logique, du gros CTA "Parler à Alex", ni de la navigation/header.
