## Objectif

Faire de `?quoteId=` la **single source of truth** sur `/entrepreneur/checkout`, et afficher systématiquement le bandeau ambre "Plan recommandé X — Offre Fondateur appliquée Y — Économie Z $" lorsque le plan sélectionné est inférieur au plan recommandé du devis.

## État actuel (vérifié)

Déjà en place dans `PageContractorCheckout.tsx` :
- Lit `?quoteId=` (et alias `quote_id`) + fallback `state.quoteId`.
- Lit `?plan=` comme override.
- `fetchPricingQuote(quoteId)` charge le devis.
- Bandeau `showDowngradeBanner` affiché si `recommendedSlug !== planSlug && recommendedPlan.price > planPrice`.
- `successUrl` / `cancelUrl` reconduisent `quote_id`.

**Manque** : plusieurs entrées qui naviguent vers `/entrepreneur/checkout` ne propagent **pas** `quoteId`, donc le devis est perdu et le bandeau ne peut jamais s'afficher depuis ces points d'entrée.

## Changements

### 1. Stocker le `quoteId` actif en session (canonique)

Dans `src/pages/entrepreneur/PagePlanResult.tsx` :
- Au mount, si `quoteId` présent dans l'URL → `sessionStorage.setItem("unpro_active_quote_id", quoteId)`.

Dans `src/pages/entrepreneur/PagePricingCalculator.tsx` (après calcul) :
- Stocker `result.quote_id` dans `sessionStorage` sous la même clé.

### 2. Helper de construction d'URL checkout

Nouveau util `src/lib/checkoutUrl.ts` :
```ts
export function buildCheckoutUrl(opts?: { plan?: string; quoteId?: string | null }) {
  const qid = opts?.quoteId ?? sessionStorage.getItem("unpro_active_quote_id");
  const params = new URLSearchParams();
  if (qid) params.set("quoteId", qid);
  if (opts?.plan) params.set("plan", opts.plan);
  const qs = params.toString();
  return `/entrepreneur/checkout${qs ? `?${qs}` : ""}`;
}
```

### 3. Propager `quoteId` dans toutes les entrées vers checkout

- `src/features/dynamicPricing/components/DynamicPlanReveal.tsx` (ligne 145) — utiliser `buildCheckoutUrl({ plan: r.recommended_plan_slug })` (annexe `quoteId` depuis la session).
- `src/components/home-orb/HeroOrbMockup.tsx` (ligne 79) — `href: buildCheckoutUrl()`.
- `src/pages/entrepreneur/PageEntrepreneurDiagnosticLanding.tsx` (ligne 229) — `navigate(buildCheckoutUrl({ plan: planSlug }))`.
- `src/components/PanelContractorAdvisorAlex.tsx` (ligne 171) — inclure `quoteId` dans le `next=` (`?next=${encodeURIComponent(buildCheckoutUrl({ plan: recommended }))}`).
- `src/hooks/useContractorFunnel.ts` (ligne 28) — exposer une fonction `getCheckoutUrl()` qui utilise le helper, ou laisser tel quel et migrer les call sites.

### 4. Renforcer le bandeau

Dans `PageContractorCheckout.tsx` :
- Vérifier que `recommendedPlan` est résolu via le catalogue canonique (`getContractorPlan(recommendedSlug)`) pour avoir le bon `price`.
- Garder le bandeau ambre existant ; ajouter `aria-live="polite"` et un lien "Choisir le plan recommandé" qui repointe sur `/entrepreneur/checkout?quoteId=...&plan=<recommended>` (un clic = upgrade explicite).

### 5. Test sanity

Build + naviguer depuis chaque entrée (DynamicPlanReveal, Diagnostic landing, HeroOrb, Plan Result) vers `/entrepreneur/checkout` et vérifier :
- `quoteId` présent dans l'URL.
- Bandeau ambre visible quand `?plan=pro` mais devis recommande `premium`.

## Hors scope

- Pas de changement de logique de tarification, de Stripe, ni de base de données.
- Pas de refonte UI au-delà du bandeau existant.
