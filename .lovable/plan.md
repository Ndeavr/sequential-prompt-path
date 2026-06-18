# Stabilité mobile UNPRO — Fix global flickering / layout jumps / bottom nav

## Objectif
Éliminer flickering, sauts de scroll, bandes blanches/bleues et chevauchement de la bottom nav sur Chrome Android, sans casser l'existant. Construire une base mobile stable pour TOUTES les pages.

## Diagnostic
- `body` en `min-height: 100vh` dans `src/index.css` → cause les jumps quand la barre d'adresse Chrome apparaît/disparaît.
- `MainLayout` en `min-h-screen` → même problème.
- ~417 fichiers utilisent `h-screen` / `min-h-screen` / `100vh`. Beaucoup sont des sections de page qui devraient être en `min-h-svh` (ou supprimées) ; seuls les overlays plein écran doivent rester en `100dvh`.
- Multiples bottom nav / sticky CTA (`MobileBottomNav`, `BottomBarMobileUniversal`, `BottomNavAlexPrimary`, `StickyMobileCTA*`, `BottomDockGlass`) sans padding-bottom global du `main` → recouvrement du contenu.
- Aucun token CSS partagé pour la hauteur de la bottom nav → impossible de compenser proprement.

## Plan d'exécution (Phase 1 — base globale)

### 1. Tokens CSS globaux (`src/index.css`)
Ajouter en `:root`:
```
--bottom-nav-h: 64px;
--bottom-nav-gap: 12px;
--safe-bottom: env(safe-area-inset-bottom, 0px);
--bottom-stack: calc(var(--bottom-nav-h) + var(--bottom-nav-gap) + var(--safe-bottom));
```

### 2. Reset mobile global (`src/index.css`)
```
html, body { overflow-x: hidden; width: 100%; }
*, *::before, *::after { box-sizing: border-box; }
body {
  min-height: 100svh;          /* remplace 100vh */
  overscroll-behavior-y: none;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
main { padding-bottom: calc(var(--bottom-stack) + 48px); }
section, main > div { max-width: 100%; }
img, video, canvas, svg { max-width: 100%; height: auto; }
```
Garder les classes utilitaires `.h-dvh-overlay { height: 100dvh }` pour overlays.

### 3. `MainLayout.tsx`
- Remplacer `min-h-screen` par `min-h-svh` (classe Tailwind via arbitrary value `min-h-[100svh]`).
- Confirmer `overflow-x-hidden` au root.
- Garantir que `<main>` n'a pas de hauteur forcée et hérite du padding-bottom global.

### 4. Bottom nav unifiée
Standard appliqué à `MobileBottomNav`, `BottomBarMobileUniversal`, `BottomNavAlexPrimary`, `BottomDockGlass`, `StickyMobileCTA*`, `StickyTrustFooter`, `FloatingMobileCTA`, `StickyMobileCTAEntrepreneur`, `StickyMobileCTAV2`, `StickyFooterPrimaryCTA`, `CTAStickyApply`, `BookingStickySummary`:
```
position: fixed;
left: 16px; right: 16px;
bottom: calc(12px + env(safe-area-inset-bottom));
max-width: calc(100vw - 32px);
z-index: 50;
height: var(--bottom-nav-h);
will-change: auto;            /* pas de transform/scale animé */
```
- Retirer tout `backdrop-filter` animé pendant le scroll (garder statique).
- Aucune bottom nav ne pousse le flow (toutes en `fixed`).

### 5. Sections de page — règles
- Remplacer `h-screen` par `min-h-svh` ou rien (hauteur naturelle).
- Remplacer `min-h-screen` interne (sous le layout) par `min-h-svh` quand nécessaire, sinon supprimer.
- Pattern recommandé pour les sections:
  ```
  <section className="relative w-full px-5 py-10 md:py-16 overflow-hidden">
  ```
- Sections sombres (ex: entrepreneur): wrapper en `overflow-visible rounded-[32px]` autour de la carte recommandée pour ne pas couper.

### 6. Backgrounds décoratifs
Règle appliquée aux blobs/glows: `absolute inset-0 -z-0 pointer-events-none` + contenu en `relative z-10`. Aucun bloc décoratif ne doit consommer de hauteur dans le flow.

### 7. Anti-jitter scroll
- Auditer hooks scroll qui mutent `height/minHeight/top/bottom/transform/opacity` sur conteneurs principaux → supprimer ou déplacer sur éléments isolés (`will-change: transform`, jamais sur wrappers parents).
- Retirer `position: sticky` non testé sur mobile (garder uniquement header validé).

### 8. Couverture cible (Phase 1)
- `src/index.css`, `src/layouts/MainLayout.tsx`
- Toutes les bottom-nav listées ci-dessus
- Page actuelle problématique: route `/index` (PageHomeVariantC + sections entrepreneur)
- Sweep grep ciblé sur pages homeowner principales:
  `PageHomeVariantC`, `PageHomeVariantB`, `PageHomeCopilot`, `HomeAbSwitch`, `MainLayout`, `ContractorProfile`, `DiscoveryFeedPage`, `OnboardingPageUnpro`.

Les 400+ autres fichiers ne sont PAS modifiés un par un : ils bénéficient automatiquement du reset global + padding-bottom + tokens. Un audit par page sera fait en Phase 2 uniquement si un bug visible persiste.

## Validation
1. `bun run build` (auto)
2. Playwright headless Chromium viewport `390x844`:
   - charger `/`, `/index`, scroll lent + rapide, screenshots avant/après
   - vérifier qu'aucune section ne saute, pas de bande blanche, bottom nav stable
3. Vérifier console (aucune erreur ResizeObserver loop)

## Hors scope
- Refonte des contenus / hiérarchie visuelle
- Changement de logique business
- Migration Supabase

## Livrable
Base mobile stable réutilisable. Toute nouvelle page qui utilise `MainLayout` + classes standard hérite automatiquement de la stabilité (svh, safe-area, padding-bottom, anti-overflow).
