# Fix — Checkout reste bloqué après "Payer"

## Diagnostic

Réseau confirmé : `POST /functions/v1/create-checkout-session` → **200**, réponse `{ "url": "https://checkout.stripe.com/c/pay/cs_live_..." }`. La fonction edge fonctionne.

Le problème est côté client : après `setIsLoading(true)`, le code exécute `window.location.href = data.url`. Dans la prévisualisation Lovable (et toute intégration en iframe), Stripe Checkout renvoie `X-Frame-Options: DENY` / `frame-ancestors 'none'`, donc le navigateur refuse de charger la page dans l'iframe. Résultat : aucune navigation, le bouton reste en état "Redirection…" et l'écran reste sur les skeletons.

## Correctif

Utiliser un helper de redirection qui :
1. Tente `window.top.location.href = url` (sort de l'iframe quand permis).
2. Si bloqué (cross-origin) → `window.open(url, '_blank', 'noopener')`.
3. Fallback final : `window.location.href = url`.

### Helper centralisé

Créer `src/lib/redirectToCheckout.ts` :

```ts
export function redirectToCheckout(url: string) {
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
      return;
    }
  } catch { /* cross-origin → fallback */ }

  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) window.location.href = url; // popup bloqué
}
```

### Remplacements

Remplacer chaque `window.location.href = data.url` (ou `= url`) menant à Stripe Checkout par `redirectToCheckout(data.url)` dans les fichiers suivants :

- `src/pages/contractor-funnel/PageContractorCheckout.tsx` (la page bloquée du screenshot)
- `src/pages/entrepreneur/activation/ScreenPayment.tsx`
- `src/pages/entrepreneur/PageOnboardingPayment.tsx`
- `src/pages/entrepreneur/PagePlanResult.tsx`
- `src/pages/checkout/PageCheckoutStripe.tsx`
- `src/pages/signature/PageAlexGuidedOnboarding.tsx`
- `src/pages/OnboardingFlow.tsx`
- `src/pages/acquisition/PageAcqActivation.tsx`
- `src/pages/contractor/PageContractorAnalysisLive.tsx`
- `src/hooks/useCondoSubscription.ts`
- `src/hooks/useFounderPlans.ts`
- `src/components/design/DesignUpgradeModal.tsx`
- `src/components/demo-isr/IsrSignaturePanel.tsx`
- `src/components/pro-landing/ActivationOffer1Dollar.tsx`
- `src/components/pricing/HomeownerCheckoutDrawer.tsx`
- `src/components/founder-plans/SectionFinalCTAFounder.tsx`
- `src/features/alex/contractor/CheckoutPanel.tsx`

### Bonus UX

Dans `PageContractorCheckout.handleCheckout`, après l'appel `redirectToCheckout`, ne pas garder `isLoading=true` indéfiniment : remettre à `false` après 1500 ms (au cas où l'utilisateur reste sur l'onglet).

## Hors scope

- Aucune modification de l'edge function `create-checkout-session` (elle répond correctement).
- Aucun changement de pricing, plans ou logique métier.
- Aucun changement visuel global.
