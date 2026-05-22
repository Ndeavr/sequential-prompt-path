# Refonte identité visuelle — Logo, Header, Footer

## 1. Nouvelles assets

- Copier l'upload chromé → `src/assets/unpro-wordmark-chrome.png` (lockup horizontal premium, métal brossé + arc bleu sur le 'O').
- Générer un favicon carré dérivé (le 'O' chromé + arc bleu, isolé sur fond transparent, premium 3D) → `public/favicon-chrome-512.png` + `public/favicon-chrome-192.png` + `public/favicon-chrome-32.png` + nouveau `public/unpro-favicon.svg` (version vectorielle du 'O' arc bleu).
- Garder `unpro-icon-fleur.png` pour avatars internes (fleur-de-lys signature québécoise).

## 2. Swap wordmark partout

Remplacer toutes les références `unpro-logo-wordmark.png`, `unpro-logo-house.png`, `unpro-logo.png` → nouveau `unpro-wordmark-chrome.png` dans :
- `src/components/navigation/SmartHeader.tsx` (lignes 24-26, 106) — un seul lockup chromé (home et pages internes).
- `src/components/navigation/SmartFooter.tsx` (lignes 10-11, 35) — wordmark unique.
- Mettre à jour le composant central `src/components/brand/UnproLogo.tsx` pour pointer sur la nouvelle asset (master lockup) — propagation automatique aux ~30 fichiers qui l'utilisent (auth, Alex, onboarding, contractor funnel, etc.).
- `UnproIcon.tsx` reste sur fleur-de-lys (avatars / contextes carrés internes).

## 3. Favicon + meta

`index.html` lignes 8-12 :
- `/favicon-32.png` → `/favicon-chrome-32.png`
- `/favicon-64.png` → `/favicon-chrome-64.png`
- `/unpro-favicon.svg` → nouvelle version 'O' chromé
- `/icon-192.png` + `/icon-512.png` → versions dérivées chrome
- Conserver `theme-color` cohérent (#060B14 dark).

## 4. Header plus premium

`SmartHeader.tsx` :
- Background : passer de `hsl(220 40% 6% / 0.82)` → gradient steel subtil :
  ```text
  linear-gradient(180deg, hsl(220 45% 7% / 0.92) 0%, hsl(220 40% 5% / 0.85) 100%)
  ```
- Border-bottom : `1px` chromé linéaire `linear-gradient(90deg, transparent, hsl(210 30% 60% / 0.18), transparent)`.
- Backdrop blur monter à `blur(28px) saturate(1.8)`.
- Logo : hover ajoute un glow bleu UNPRO subtil (`drop-shadow(0 0 18px hsl(217 91% 60% / 0.35))`).
- Hauteur conservée (h-14 / h-16). Aucune logique modifiée (back button, mega menu, Alex orb, QR, profile menu, mobile drawer intacts).

## 5. Footer plus premium

`SmartFooter.tsx` :
- Background : remplacer plain `hsl(220 40% 4% / 0.8)` par gradient + texture leather :
  ```text
  radial-gradient(ellipse 60% 40% at 50% 0%, hsl(217 91% 60% / 0.04), transparent 60%),
  linear-gradient(180deg, hsl(220 40% 5%) 0%, hsl(220 45% 3%) 100%)
  ```
- Bloc Brand : wordmark chromé `h-12`, sous-titre raffiné, micro-badge `Concierge IA · Québec` avec fleur-de-lys ⚜️ en accent.
- Divider du milieu : remplacé par un trait chromé `via-primary/20` au lieu de `via-border/30`.
- Bottom bar : ajout d'un signature lockup compact (icône fleur + © UNPRO {year} · Fait au Québec ⚜️), social links gardés mais hover bleu UNPRO au lieu de gris.
- Sections dynamiques (config-driven) inchangées.

## 6. Hors scope

- Pas de changement de structure de navigation, pas de nouveaux liens, pas de logique métier.
- Aucun toucher aux composants Alex, voice, auth, pricing.
- Pas de migration DB.

## Détails techniques

- L'upload sera copié via `code--copy user-uploads://file_0000000049b0720c9480f28e0e53b974.png src/assets/unpro-wordmark-chrome.png`.
- Le favicon dérivé sera généré via `imagegen--edit_image` à partir de l'upload : prompt = "isolate just the chrome 'O' letter with the blue arc, on solid white background, premium 3D, perfectly centered" puis `transparent_background=true`. Sortie : `public/favicon-chrome-512.png` (1024×1024), recopiée/resized en 192 et 32 via ImageMagick (`nix run nixpkgs#imagemagick`).
- Toutes les références aux 3 anciennes assets wordmark (`unpro-logo-wordmark.png`, `unpro-logo-house.png`, `unpro-logo.png`) seront remplacées par un import unique `unpro-wordmark-chrome.png` (le fichier `UnproLogo.tsx` reste l'API canonique pour propager à tous les écrans).
- Pas de changement aux semantic tokens HSL existants — uniquement composition de gradients dans les surfaces header/footer.
