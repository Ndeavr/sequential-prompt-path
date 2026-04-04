
Objectif
- Rétablir le chargement de l’app sans écran blanc et sécuriser les routes d’entrée qui cassent actuellement le preview.

Ce que j’ai trouvé
- Les logs actuels montrent surtout un problème de WebSocket HMR Vite dans le preview (`failed to connect to websocket`).
- La route courante est `/index`, mais le routeur ne définit que `/`.
- Le replay montre aussi une navigation vers `/entrepreneur/aipp-analysis`, alors que le routeur définit seulement `/entrepreneur/analysis/loading`.
- `src/app/router.tsx` importe énormément de pages au démarrage. Donc une seule page cassée peut faire tomber toute l’app avant même que la bonne route ne s’affiche.
- Le correctif précédent sur Leaflet semble déjà appliqué côté dépendances: la pile React 18 visible est cohérente.

Do I know what the issue is?
- Oui, assez pour corriger proprement: il y a au moins 2 causes concrètes à traiter tout de suite:
  1. configuration HMR Vite non adaptée au preview proxifié
  2. routes d’entrée manquantes (`/index`, `/entrepreneur/aipp-analysis`)
- Et 1 risque structurel à réduire:
  3. imports eager du routeur qui peuvent blank-screen toute l’app.

Plan d’implémentation
1. Corriger le boot du preview
- Mettre à jour `vite.config.ts` pour une config HMR compatible avec le proxy du preview.
- Approche la plus sûre: simplifier/supprimer l’override HMR actuel, ou le remplacer par une config proxy-safe (`wss`, port client 443).

2. Ajouter les routes de compatibilité manquantes
- Dans `src/app/router.tsx`, créer des redirections explicites:
  - `/index` → `/`
  - `/entrepreneur/aipp-analysis` → `/entrepreneur/analysis/loading`
- Garder la page fallback pour les vraies routes inconnues, pas pour ces anciennes entrées connues.

3. Empêcher l’écran blanc global
- Ajouter une vraie error boundary autour du routeur dans `src/app/App.tsx`.
- Afficher un écran de récupération utile au lieu d’un blank screen si une page plante au chargement.

4. Réduire la surface de crash au démarrage
- Passer les pages lourdes/admin en lazy loading (`React.lazy` + `Suspense`), en commençant par:
  - `PageAdminClusterPlanProjectSizeMatrix`
  - `PageAdminProjectSizeExtensions`
  - autres pages admin importées globalement
- Ainsi, une page admin cassée ne bloquera plus l’accueil ni les routes publiques.

5. Vérifier les composants montés globalement
- Revalider les composants toujours présents au boot:
  - `BannerContinueFlow`
  - `AuthOverlayPremium`
  - `HelpPopup`
  - `GlobalAlexOverlay`
- Garder leurs effets asynchrones non bloquants et défensifs.

Fichiers à modifier
- `vite.config.ts`
- `src/app/router.tsx`
- `src/app/App.tsx`
- nouveau composant type `src/components/errors/AppErrorBoundary.tsx`

Critères de succès
- `/` charge normalement
- `/index` redirige proprement vers l’accueil
- `/entrepreneur/aipp-analysis` ouvre bien le flow entrepreneur
- le preview ne casse plus à cause du HMR
- une page admin défectueuse ne bloque plus toute l’application
- les routes inconnues affichent un fallback, pas un écran blanc

Détails techniques
- Aucun changement backend n’est nécessaire pour ce correctif.
- Si le bug est visible sur le site publié, il faudra republier les changements frontend après implémentation.
