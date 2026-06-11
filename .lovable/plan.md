
## Objectif
Revenir à un fond **blanc premium** avec intelligence bleue **en filigrane** (pas un aplat bleu), et rendre la carte **"Trouver un pro"** prépondérante.

## Règle visuelle imposée
80% blanc/glace · 15% bleu très pâle · 5% bleu accent.
Le bleu doit **éclairer** la page, pas la remplir.

---

## 1. IntelligenceBackground — calibrage

### `LayerGradientField.tsx` (tone=light)
Remplacer par fond quasi-blanc + halos très localisés :
```
radial-gradient(circle at 15% 12%, rgba(59,130,246,0.08), transparent 28%),
radial-gradient(circle at 88% 25%, rgba(14,165,233,0.06), transparent 25%),
radial-gradient(circle at 50% 88%, rgba(99,102,241,0.05), transparent 30%),
linear-gradient(180deg, #fdfdff 0%, #f7f9fc 50%, #f2f5fa 100%)
```
(supprimer le 4e radial bleu saturé)

### `LayerFloatingDataOrbs.tsx`
- Réduire opacités ×0.4 (0.42→0.17, 0.38→0.15, 0.40→0.16, 0.35→0.14, 0.22→0.10, 0.28→0.12).
- Supprimer 2 orbes centrales (garder 4 aux coins seulement → coins texturés ClothLink).

### `LayerHousingMesh.tsx`
- opacity prop default 0.14 → **0.05**
- strokeWidth 1.1 → 0.7
- Nœuds opacity 0.85 → 0.35, r 3.2 → 2.2

### `LayerDotIntelligenceField.tsx`
- opacity default 0.20 → **0.08**

### `HousingKnowledgeGraph.tsx`
- opacity globale → **0.07** (entre 0.06 et 0.10)
- twinkle 0.40–0.95 → 0.25–0.55

### `LayerHouseBlueprintGhost.tsx`
- Garder le blueprint (c'est ce qu'on veut derrière l'orb) mais opacity 0.09 → **0.06**
- Grille blueprint opacity 0.35 → 0.18
- Couleur stroke `#1E40AF` → `#3B82F6` (plus doux)

### `LayerNeuralGlow.tsx`
- Halo principal : rgba(59,130,246,0.55) → **rgba(59,130,246,0.22)**
- 2e halo cyan 0.6 → 0.25
- Reste localisé derrière l'orb uniquement (déjà le cas)

### `IntelligenceBackground.tsx`
- Pour `hero` : passer `LayerHousingMesh opacity={0.05}` et `LayerDotIntelligenceField opacity={0.08}` explicitement.

### Test de validation
Screenshot mobile sans contenu : le fond doit paraître **blanc cassé avec accents bleus diffus**, jamais un aplat bleu. Si dominante bleue > 20%, baisser encore.

---

## 2. Carte "Trouver un pro" prépondérante

Dans le grid "Ce qu'Alex peut faire" du hero PIM (`HeroSectionPIMLanding.tsx` ou composant grid actions) :

- Carte **"Trouver un pro"** devient :
  - `col-span-2` sur mobile (pleine largeur), au-dessus des autres
  - Fond gradient primary (`from-primary to-primary/85`) avec texte blanc
  - Icône plus grande (h-7 w-7), badge "Recommandé" en haut à droite
  - Hauteur +30%, ombre `shadow-glow`
  - CTA explicite "Trouver maintenant →"
- Les autres cartes restent en grid 2 colonnes en dessous, style actuel (blanc, neutre).
- Supprimer la carte "Recommander un pro" barrée dans la capture (doublon).

---

## Hors scope
- Pas de changement de contenu/texte hero
- Pas de modif du composant orb Alex
- Pas de logique métier
