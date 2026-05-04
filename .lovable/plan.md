## Problème

Le composant `AlexTradesAura` est bien monté et les 8 images existent dans `src/assets/trades/`, mais elles sont **invisibles** à l'écran pour 3 raisons cumulées :

1. **Opacité trop faible** : `animate={{ opacity: 0.22 }}` + `blur-[2px]` → presque noir sur fond `#060B14`.
2. **Vignette destructive** : la couche finale `bg-[radial-gradient(...transparent_20%,hsl(var(--background))_75%)]` recouvre l'image avec la couleur de fond du site sur 80% de la zone, annulant l'effet.
3. **Positionnement** : `<AlexTradesAura>` est sibling de `<AlexOrb>` dans un conteneur `flex flex-col`. Avec `absolute inset-0`, il s'étale sur toute la colonne (titre + orb + badge + CTA) au lieu d'être centré juste derrière l'orbe → l'image apparaît décalée vers le haut, pas derrière l'orbe.

## Correctifs

### 1. `src/components/home-simple/AlexTradesAura.tsx`
- Augmenter l'opacité de `0.22` → `0.55` (visible mais subtil derrière l'orbe lumineux).
- Réduire le blur (`blur-[2px]` → `blur-[1px]`) pour garder la lisibilité du métier.
- Remplacer la vignette « background-color » par une vignette **transparente** (alpha gradient) qui assombrit doucement les bords sans masquer le centre :
  - `bg-[radial-gradient(circle_at_center,transparent_35%,rgba(6,11,20,0.85)_80%)]`
- Ajuster le mask radial pour un fade plus doux : `black 45%, transparent 85%`.
- Optionnel : ajouter une légère rotation/scale lente pour donner vie.

### 2. `src/components/home-simple/HeroAlexCentered.tsx`
- Envelopper **uniquement** l'orbe + l'aura dans un wrapper `relative` dimensionné (ex: `w-[320px] h-[320px] mx-auto flex items-center justify-center`).
- Mettre `<AlexTradesAura />` à l'intérieur de ce wrapper en `absolute inset-0` → l'aura est centrée précisément derrière l'orbe, pas sur toute la section.
- Garder le badge « Alex · Votre expert IA » et le bouton « Cliquez pour parler à Alex » **hors** de ce wrapper (en-dessous), sans aura derrière.

### Structure cible

```text
<motion.div className="relative mt-12 mx-auto flex flex-col items-center">
  <div className="relative w-[320px] h-[320px] flex items-center justify-center">
    <AlexTradesAura />            ← absolute inset-0, centré derrière l'orbe
    <AlexOrb size="hero" ... />   ← z-index naturel au-dessus
  </div>
  <div className="mt-8 ...">badge Alex</div>
  <button>...</button>
</motion.div>
```

## Résultat attendu

Une image de métier (rénovation, céramique, peinture, excavation, notaire, plomberie, électricité, menuiserie) apparaît en **fade circulaire** derrière l'orbe Alex, change toutes les ~3.8 s avec une transition douce, reste suffisamment visible pour reconnaître le métier sans concurrencer l'orbe.
