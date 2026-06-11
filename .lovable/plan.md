## Diagnostic

Le calibrage précédent a bien été appliqué aux couches `IntelligenceBackground`, mais il était invisible : le wrapper de la page (`.unicorn-theme` dans `src/styles/unicorn-theme.css`) peint **son propre fond bleu saturé** par-dessus, qui domine tout :

```css
radial-gradient(1100px 700px at 80% -10%, rgba(59,130,246,0.18), ...)   ← halo bleu massif en haut
radial-gradient(900px 600px at -10% 30%, rgba(189,231,255,0.35), ...)   ← voile cyan 35%
radial-gradient(800px 900px at 50% 110%, rgba(99,102,241,0.10), ...)
```

C'est ce fond-là que vous voyez — pas les couches calibrées.

## Correction

### 1. `src/styles/unicorn-theme.css` — désaturer le fond du thème
- Halo top-right : `0.18` → **0.06**
- Voile cyan : `0.35` → **0.12**
- Halo bas : `0.10` → **0.04**
- Base : garder `#FFFFFF → #F7FAFF → #EEF4FF` (blanc/glace)

Résultat : 80% blanc, le bleu redevient un filigrane et les couches IntelligenceBackground (mesh, blueprint, knowledge graph) deviennent enfin perceptibles au lieu d'être noyées.

### 2. Halo derrière l'orb (hero)
Le halo `LayerNeuralGlow` + le radial du thème se superposent au même endroit (top-right) → tache bleue derrière l'orb trop forte. Avec le thème désaturé, garder LayerNeuralGlow tel quel (0.22) — il redevient un accent local correct.

### 3. Validation
Screenshot mobile avant/après : le haut de page doit paraître blanc cassé avec un accent bleu doux derrière l'orb, jamais un dégradé bleu plein.

## Note
La carte "Trouver un pro" prépondérante est déjà visible et fonctionnelle (badge Recommandé, pleine largeur, gradient) — confirmé par screenshot.

## Hors scope
Aucun changement de contenu, de logique ou des couches déjà calibrées.