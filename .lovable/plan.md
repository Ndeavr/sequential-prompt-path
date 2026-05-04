## Problèmes
1. **Flicker lors des changements d'image** — `AnimatePresence` démonte/remonte le `<motion.div>` à chaque cycle. Les images ne sont pas préchargées → frame blanche pendant le décodage.
2. **Texte couvert par les images** — l'aura est positionnée seulement derrière l'orbe (dans son conteneur 420×420), mais son `-inset-32/-40/-48` la fait déborder par-dessus le titre/sous-titre. L'utilisateur veut **garder le texte au-dessus** des images, pas l'inverse.

## Correctifs

### 1. `src/components/home-simple/AlexTradesAura.tsx` — Crossfade sans flicker
Remplacer `AnimatePresence` (mount/unmount) par **8 calques `<motion.img>` montés en permanence** dont seule l'opacité s'anime. Précharger les 8 images au mount via `new Image()`.

```tsx
// preload
useEffect(() => { TRADES.forEach(t => { const i = new Image(); i.src = t.src; }); }, []);

// render
{TRADES.map((trade, i) => (
  <motion.img
    key={trade.src}
    src={trade.src}
    initial={false}
    animate={{ opacity: i === index ? 0.78 : 0 }}
    transition={{ duration: 2.6, ease: "easeInOut" }}
    className="absolute inset-0 ... will-change-[opacity]"
    style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    decoding="async"
    loading="eager"
  />
))}
```
- Plus de `AnimatePresence`, plus de `mode="sync"`.
- `will-change: opacity` → compositing GPU stable.
- Intervalle: 7000ms; transition: 2600ms.

### 2. `src/components/home-simple/HeroAlexCentered.tsx` — Texte au-dessus
Garantir que titre + sous-titre restent visibles par-dessus l'aura (qui déborde via `-inset-48`):
- Ajouter `relative z-10` au `<motion.h1>` et au `<motion.p>`.
- Ajouter `isolate` à la `<section>` pour créer un stacking context propre.
- Ajouter `relative z-0` au conteneur 420×420 (l'orbe garde son `z-10` interne).

Résultat : les images débordent visuellement vers le haut, mais le texte reste lisible (au-dessus).

## Hors scope
- Pas de changement sur `AlexOrb` ni le bottom-nav (le remplacement de "A" → micro reste à faire séparément si désiré).
- Pas de changement sur les images, intervalle ou opacité maximale (78%).

## Résultat attendu
- Transitions fluides, aucun flash blanc/noir entre les métiers.
- Titre et sous-titre **toujours lisibles** par-dessus l'aura qui déborde.
