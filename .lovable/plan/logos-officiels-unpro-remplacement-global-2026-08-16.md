# Logos officiels UNPRO — remplacement global

Trois logos officiels ont été fournis : wordmark rectangulaire (fond bleu), carré (fond bleu, coins arrondis), rond (fond bleu pâle, marque bleue). Ils deviennent la seule source visuelle de la marque.

## Ce qui change

1. **Publication CDN** des 3 fichiers via Lovable Assets (`src/assets/brand/`) :
   - `unpro-logo-wordmark.png` (rectangulaire)
   - `unpro-logo-square.png` (carré)
   - `unpro-logo-round.png` (rond)
   Aucun binaire laissé dans le repo.

2. **Source unique de marque** (`src/config/branding.ts`) mise à jour : `logo` pointe vers le nouveau wordmark, plus deux entrées `logoSquare` et `logoRound`.

3. **`UnproLogo` / `UnproIcon`** remappés :
   - `showWordmark` → wordmark officiel (ratio recalculé sur les vraies dimensions du fichier).
   - marque seule / avatar → logo rond sur surfaces claires, logo carré sur surfaces sombres.
   - Les variantes historiques (`mono`, `mono-invert`, `rubber`) restent supportées mais retombent sur les officiels : le fond bleu du wordmark fonctionne sur clair comme sur sombre, donc plus de version grise/noire séparée.
   - Les 5 anciens pointeurs `unpro-logo-*.asset.json` sont supprimés (CDN + fichier) une fois zéro référence restante.

4. **Favicon et icônes d'app** régénérés à partir du logo carré (fichiers réels dans `public/`, jamais des pointeurs) : `favicon.png` 64px, `favicon-32.png`, `apple-touch-icon.png` 180px, `android-chrome-192/512`, `maskable-512`, `icon-192/512`. `index.html` et `manifest.webmanifest` repointés, ancien `favicon.ico` retiré.

5. **Partage social** : l'image OG « La fin des 3 soumissions » est régénérée avec le vrai wordmark officiel, sous un nouveau nom versionné pour casser les caches (Facebook/iMessage/SMS). Le lien SMS sortant hérite automatiquement de la nouvelle image via le builder de lien existant.

6. **Schema / IA** : `UNPRO_IDENTITY.logo` et `src/lib/seoSchema.ts` repointés vers l'URL CDN officielle (utilisée par les crawlers et les moteurs de réponse).

## Vérification

- Recherche globale : aucune référence résiduelle aux anciens fichiers logo.
- Contrôle visuel du header, du footer, de la page d'accueil, de l'écran d'activation entrepreneur et du tableau de bord admin, sur mobile et desktop, en thème clair et sombre.
- Build et typecheck verts.

## Détails techniques

Les pointeurs `.asset.json` sont créés avec `lovable-assets create` depuis `/mnt/user-uploads/`, jamais écrits à la main. Les icônes `public/` sont produites par `magick … -background none -gravity center -extent NxN` pour préserver les proportions. Aucune logique métier, aucun changement de tarification ou de funnel.
