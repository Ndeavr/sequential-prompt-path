## Contexte

Flow concerné : `/contractor/join` → `/contractor/analysis?run=…` → checkout Stripe à 1 $ (Activation Fondateur) → `/contractor/activated`.

Symptôme rapporté : après sélection du forfait Recrue (149 $/mois, 1 $ aujourd'hui), la page de paiement s'ouvre blanche.

Trois causes identifiées dans le code actuel :

1. **Plan `recrue` absent des maps** dans `src/pages/contractor/PageContractorAnalysisLive.tsx` (`PLAN_LABEL` et `PLAN_PRICE` ne contiennent que pro/premium/elite/signature). Quand le backend recommande `recrue`, la carte plan affiche « UNPRO undefined » et un tarif à 0 $, ce qui casse la confiance et déclenche des warnings React.
2. **Redirection Stripe fragile** dans `src/lib/redirectToCheckout.ts` : appelée après un `await` (perte du « user gesture »), `window.open(url, '_blank')` est bloqué sur iOS Safari + iframe preview ; le fallback `window.location.href` peut aussi laisser un onglet vide à cause de `X-Frame-Options: DENY` côté Stripe quand on est dans une iframe.
3. **Aucun lien de secours visible** : si la redirection échoue, l'utilisateur ne voit qu'un bouton désactivé et un éventuel toast → perception « page blanche ».

## Objectif

Éliminer la page blanche après clic sur « Activer mon profil — 1,00 $ aujourd'hui » et garantir qu'un lien de paiement cliquable reste toujours visible.

## Modifications

### 1. `src/pages/contractor/PageContractorAnalysisLive.tsx`
- Ajouter `recrue: "Recrue"` à `PLAN_LABEL` et `recrue: 149` à `PLAN_PRICE`.
- Renforcer le rendu : si `PLAN_LABEL[plan]` est indéfini, afficher le slug capitalisé en fallback.
- Dans `CheckoutButton` :
  - Garder le `setBusy(true)` mais ne plus appeler `redirectToCheckout` après un long `await`. Pré-créer la session côté composant : appel à `activation-create-checkout` au moment où `ready && plan` devient vrai, stocker `checkoutUrl` dans un state.
  - Le bouton devient un `<a href={checkoutUrl} target="_top" rel="noopener">` quand l'URL est prête (préserve le user-gesture, échappe à l'iframe via `_top`).
  - Tant que l'URL n'est pas prête : afficher « Préparation du paiement sécurisé… » avec spinner.
  - En cas d'erreur d'invocation : afficher un message d'erreur + bouton « Réessayer ».
  - Toujours afficher en dessous un lien texte secondaire « Ouvrir le paiement dans un nouvel onglet → » (`target="_blank"`) comme filet de sécurité.

### 2. `src/lib/redirectToCheckout.ts`
- Conserver la fonction pour les autres usages, mais ajouter un export `buildTopLevelHref(url)` qui retourne `url` (utilisé comme `href` d'ancre). Ne plus dépendre de `window.open` pour ce flow critique.

### 3. `src/components/first-customer-48h/FounderOfferCard.tsx` (`/pro/activate`)
- Même pattern : exposer un `<a>` cliquable dès que l'URL Stripe est obtenue (déjà déclenchée par `onActivate`). Si la prop `onActivate` reste asynchrone, ajouter un état `checkoutUrl` injecté par le parent (`PageProActivate`) et rendu en lien `target="_top"` plutôt qu'un `window.location.assign` post-await.

### 4. `src/pages/pro/PageProActivate.tsx`
- Refactor `startCheckout` : stocker `setCheckoutUrl(url)` dans le state au lieu de `window.location.assign(url)` ; passer `checkoutUrl` à `FounderOfferCard`. Le composant rend une ancre `_top` dès que l'URL existe, et déclenche aussi `window.top.location.href = url` en best-effort pour redirection auto.

## Hors scope

- Pas de modification de l'edge function `activation-create-checkout` (elle fonctionne, retourne `{ url }`).
- Pas de changement de prix, ni de logique de matching de plan.
- Pas de refonte UI au-delà du bouton/lien de paiement.

## Vérification

1. `/contractor/join` → soumettre `isroyal.ca` → arriver sur `/contractor/analysis?run=…`.
2. Vérifier que la carte plan affiche correctement « UNPRO Recrue · 149 $/mois » quand le backend recommande `recrue`.
3. CTA sticky : confirmer qu'il devient un lien actif avec URL Stripe (inspecter `href`), que cliquer ouvre Stripe Checkout dans le top-level (pas l'iframe preview).
4. Couper le réseau avant clic → message d'erreur visible + bouton « Réessayer », pas de blanc.
5. Idem `/pro/activate` : remplir le formulaire, cliquer « Activer », vérifier qu'un lien cliquable mène à Stripe sans page blanche.
