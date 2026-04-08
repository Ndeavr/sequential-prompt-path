

## Plan: Remplacer tous les `window.open` par `window.location.href` pour les paiements

### Problème
Plusieurs flux de paiement utilisent `window.open(url, "_blank")` pour ouvrir Stripe Checkout dans un nouvel onglet. Les navigateurs mobiles bloquent souvent ces pop-ups, résultant en une page blanche (comme sur le screenshot).

### Solution
Remplacer tous les `window.open(url, "_blank")` liés aux paiements Stripe par `window.location.href = url` pour rester dans le même onglet.

### Fichiers à modifier

1. **`src/pages/OnboardingFlow.tsx`** (ligne 182)
   - `window.open(data.url, "_blank")` → `window.location.href = data.url`

2. **`src/pages/contractor-funnel/PageContractorCheckout.tsx`** (ligne 86)
   - `window.open(data.url, "_blank")` → `window.location.href = data.url`

3. **`src/hooks/useCondoSubscription.ts`** (ligne 31)
   - `window.open(data.url, "_blank")` → `window.location.href = data.url`

4. **`src/hooks/useFounderPlans.ts`** (ligne 81)
   - `window.open(url, "_blank")` → `window.location.href = url`

5. **`src/components/design/DesignUpgradeModal.tsx`** (ligne 27)
   - `window.open(data.url, "_blank")` → `window.location.href = data.url`

### Résultat
Tous les flux de paiement Stripe redirigent dans le même onglet — plus de pop-up bloqué, navigation fluide sur mobile et desktop.

### Fichiers modifiés
5 fichiers — 1 ligne chacun

