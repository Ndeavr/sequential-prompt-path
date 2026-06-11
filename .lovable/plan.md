## Plan — Amplifier IntelligenceBackground (×5 intensité visuelle)

Le système est en place mais ses opacités (0.03–0.08) le rendent invisible. Objectif : couches clairement perceptibles type ClothLink/Arc/Vision Pro, sans distraire du contenu.

### 1. `intelligence-bg.css` — keyframes additionnelles
- `ub-pulse` (twinkle plus marqué 0.4 → 0.95)
- `ub-blueprint-drift` (translation lente forme fantôme)
- Augmenter blur orbes : 110px desktop, 85px mobile

### 2. `LayerGradientField.tsx` — gradients plus saturés
- Bleu TL 0.12 → **0.22**, Cyan 0.08 → **0.18**, Indigo 0.08 → **0.16**
- Ajouter un 4e radial bleu profond bottom-right `rgba(37,99,235,0.14)`
- Base linear : `#f0f5ff → #e8f0fe` (au lieu de `#f8fbff`)

### 3. `LayerHousingMesh.tsx` — densifier mesh
- Opacité par défaut 0.05 → **0.14**
- strokeWidth 0.6 → **1.1**
- Ajouter 6 courbes diagonales supplémentaires
- Nœuds : r 2.2 → **3.2**, opacity 0.55 → **0.85**

### 4. `LayerDotIntelligenceField.tsx` — champ plus dense
- Opacité 0.08 → **0.20**
- r 1.3 → **2.0**
- Doubler densité (step 16 → 10) + ajouter cluster top-left (silhouette pignon)
- Couleur : ajout halo via filter `url(#dot-glow)` Gaussian blur

### 5. `LayerFloatingDataOrbs.tsx` — orbes ×2
- Opacités 0.16–0.22 → **0.35–0.48**
- Tailles +20%
- Ajouter 2 orbes additionnels (ambre soft + violet) pour profondeur

### 6. **NOUVEAU** `LayerHouseBlueprintGhost.tsx`
Couche 5 — Grande maison filaire fantôme derrière le hero :
- SVG plein-écran, viewBox 1600×1000
- Silhouette maison + toiture + fenêtres + porte + cheminée en stroke 1.5
- Opacité **0.07**, couleur `#1E40AF`
- Position décalée (right -10%, scale 1.4)
- Animation `ub-blueprint-drift` 60s
- Légères annotations "blueprint" : cotes, axes
- Wired automatiquement dans `IntelligenceBackground` pour variants `hero`, `passport`, `default`

### 7. **NOUVEAU** `LayerNeuralGlow.tsx`
Couche 6 — Halo radial intelligent derrière l'orb Alex :
- Cercle blurry `rgba(59,130,246,0.35)` 600px, blur 80px
- Animation `ub-breath` 8s
- Variants `hero` + `alex` uniquement
- Positionné droite ~30% top

### 8. `HousingKnowledgeGraph.tsx` — graphe géant
- Nœuds 11 → **38** (générés sur grille jitter)
- Liens 15 → ~**55** (chaque nœud relié à 2-3 voisins)
- Opacité 0.06 → **0.14**
- strokeWidth 0.7 → **1.0**
- Glyphes nœuds plus visibles (r 2 → 3.5, twinkle 0.4 → 0.95)

### 9. `IntelligenceBackground.tsx` — orchestration
- Monter z-index par défaut de `-10` à `-1` quand le parent est `relative` (rester derrière contenu mais devant background blanc)
- Brancher `LayerHouseBlueprintGhost` sur `hero`/`passport`/`default`
- Brancher `LayerNeuralGlow` sur `hero`/`alex`
- Garder respect `prefers-reduced-motion`

### 10. Test visuel
Critère : capturer hero, masquer texte+orb mentalement → le fond doit rester riche (gradient saturé + mesh visible + blueprint maison + graph + orbes colorés).

### Hors scope
Pas de changement de typo, contenu, CTA, ni de nouveau composant produit. Vocabulaire visuel inchangé (maison/mémoire/réseau — jamais circuits/crypto/cadenas).