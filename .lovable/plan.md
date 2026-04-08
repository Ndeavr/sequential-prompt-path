

## Plan: Intégrer Stripe Embedded Checkout dans la page de tarification

### Probleme
Quand l'utilisateur clique "Choisir Pro", il est redirigé vers `checkout.stripe.com` dans un onglet externe. C'est lent, casse l'expérience, et les pop-ups sont parfois bloqués par le navigateur.

### Solution
Utiliser **Stripe Embedded Checkout** (`ui_mode: "embedded"`) pour afficher le formulaire de paiement directement sous le plan sélectionné, sans quitter la page.

### Comment ca marche

```text
[Plan cards]
   |
   v  (click "Choisir Pro")
   |
[Plan card se collapse / autres plans masqués]
   |
   v
[Stripe Embedded Checkout iframe rendu inline]
   |
   v  (paiement complété)
   |
[Success state inline ou redirect vers /pro/onboarding]
```

### Changements

**1. Installer `@stripe/stripe-js` et `@stripe/react-stripe-js`**
- Dépendances npm pour le SDK Stripe frontend et les composants React

**2. Modifier l'edge function `create-checkout-session`**
- Ajouter support pour `ui_mode: "embedded"` quand le frontend le demande
- Retourner `client_secret` au lieu de `url` en mode embedded
- Ajouter `return_url` au lieu de `success_url`/`cancel_url`

**3. Modifier `ContractorPlans.tsx`**
- Quand un plan est sélectionné : masquer les autres cards, afficher un composant `EmbeddedCheckout` sous la card active
- Bouton "Retour" pour annuler et revenir à la vue plans
- Passer `fetchClientSecret` qui appelle l'edge function avec `ui_mode: "embedded"`

**4. Créer `src/components/pricing/InlineStripeCheckout.tsx`**
- Composant wrapper utilisant `EmbeddedCheckoutProvider` + `EmbeddedCheckout` de `@stripe/react-stripe-js`
- Charge `loadStripe` avec la clé publique Stripe
- Gère les états loading/error
- Callback `onComplete` pour afficher le succès ou rediriger

### Edge function changes (detail)

```typescript
// Ajout dans create-checkout-session/index.ts
const { uiMode } = body; // nouveau param

if (uiMode === "embedded") {
  checkoutConfig.ui_mode = "embedded";
  checkoutConfig.return_url = successUrl + "?session_id={CHECKOUT_SESSION_ID}";
  delete checkoutConfig.success_url;
  delete checkoutConfig.cancel_url;
}

// Retour conditionnel
if (uiMode === "embedded") {
  return { clientSecret: session.client_secret };
} else {
  return { url: session.url };
}
```

### Frontend flow (detail)

```typescript
// InlineStripeCheckout.tsx
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// fetchClientSecret calls edge function with uiMode: "embedded"
// Returns session.client_secret
```

### Fichiers modifiés
1. `package.json` — ajouter `@stripe/stripe-js` + `@stripe/react-stripe-js`
2. `supabase/functions/create-checkout-session/index.ts` — support `ui_mode: "embedded"`
3. `src/pages/pricing/ContractorPlans.tsx` — state pour plan sélectionné, affichage conditionnel
4. `src/components/pricing/InlineStripeCheckout.tsx` — nouveau composant embedded checkout

### Note sur la clé Stripe publique
Il faudra ajouter `VITE_STRIPE_PUBLISHABLE_KEY` dans le code (clé publique, safe à stocker dans le codebase). Je vérifierai si elle existe déjà ou la demanderai.

