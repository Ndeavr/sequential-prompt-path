## Problem

Sur mobile, Alex s'ouvre en mode "floating" (compact panel) sur les surfaces `home_/intent_/capability_/discovery_`. Résultat :
- Panneau mi-écran (pas plein écran), pas au-dessus de la page
- Fond gris-bleu sombre `rgba(10,18,40,0.48)` → lecture grise au lieu d'Apple blue
- Flicker = montage/démontage AnimatePresence + key change quand `displayMode` bascule, plus animation `uc-glass-panel-in` qui rejoue à chaque re-render parent

## Fix (3 changements ciblés)

### 1. Forcer plein écran sur mobile
`src/contexts/AlexVoiceContext.tsx` → `defaultDisplayModeFor()` : retourner `"fullscreen"` quand `window.innerWidth < 768`, même pour les préfixes `home_/intent_/capability_/discovery_`. Garder floating uniquement desktop ≥ 768px.

### 2. Glassmorphisme Apple blue
`src/styles/unicorn-theme.css` `.uc-alex-floating-panel` (utilisé desktop) ET le fullscreen wrapper :

- Remplacer le fond gris foncé par un dégradé bleu translucide Apple-like :
  ```
  background:
    linear-gradient(180deg, rgba(59,130,246,0.18) 0%, rgba(14,30,72,0.42) 100%),
    rgba(10,22,55,0.32);
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.22);
  ```
- Ajouter une `inset` highlight bleue subtile et un glow `0 0 80px rgba(59,130,246,0.28)`.
- Pour le fullscreen (ligne 849-851) : remplacer `bg-background` + `bg-background/95 backdrop-blur-xl` par la même surface verre bleue, avec `inset: 0; z-index: 9999`.

### 3. Éliminer le flicker
Dans `src/components/voice/OverlayAlexVoiceFullScreen.tsx` :
- Retirer `AnimatePresence` autour d'un seul enfant systématiquement présent (les blocs floating et fullscreen). Garder uniquement un `motion.div` avec `initial`/`animate`, sans `exit`, monté une seule fois.
- Stabiliser la `key` : utiliser une clé constante (`"alex-panel"`) au lieu de basculer entre floating/fullscreen → si l'utilisateur reste en fullscreen, pas de remount.
- CSS : retirer `animation: uc-glass-panel-in 380ms ... both` (joué à chaque re-render). L'apparition est gérée par framer-motion uniquement.
- Le backdrop : passer `pointer-events:none` + `will-change: opacity` pour éviter le repaint flash.

## Hors scope
- Pas de changement à `alexVoiceLockedStore` ni à la logique vocale/Eleven Labs.
- Pas de retrait du bouton "Agrandir" (utile desktop).
- Pas de modif des controls / bouton Raccrocher.

## Validation
- Mobile 384px : Alex ouvre en plein écran (inset 0), z-index au-dessus de tout, verre bleu Apple lisible, aucun clignotement à l'apparition ni pendant les changements d'état (listening → speaking).
- Desktop ≥ 768px : panneau flottant bas-droit conserve son comportement actuel, mais en bleu Apple.
- `prefers-reduced-motion` toujours respecté.
