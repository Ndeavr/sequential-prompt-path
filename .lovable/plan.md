## Objectif

Remplacer le pricing RDV générique (`130 $/RDV`, `1.3k$`) par un moteur dynamique crédible basé sur l'industrie, la région et la valeur réelle des contrats — et corriger le format monétaire partout (`1 300 $` au lieu de `1.3k$`).

## 1. Format monétaire global (correctif immédiat)

Créer `src/lib/formatPrice.ts` :
- `formatPrice(dollars)` → `Intl.NumberFormat('fr-CA', { style:'currency', currency:'CAD', maximumFractionDigits:0 })` rendu en `1 300 $` (espace insécable, pas de `k`).
- `formatPriceCents(cents)` wrapper.
- `formatPricePerRdv(dollars)` → `≈ 130 $ / rendez-vous qualifié`.

Remplacer toutes les occurrences `k$` / `toFixed` :
- `src/lib/appointmentPricing.ts` (ligne 78-80)
- `src/config/contractorPlans.ts` `formatPrice`
- `src/components/voice-sales/PanelLeadPackSelector.tsx`, `CardPlanRegular.tsx`, `CardPlanFounders.tsx`
- `PageContractorPlanOnboarding.tsx`, `PanelPlanFitCheck.tsx`
- `pages/checkout/PageCheckoutStripe.tsx`

Garde-fou test : ajouter un test simple bloquant `k$` dans les fichiers UI clés.

## 2. Moteur de prix intelligent

### Tables Supabase

`industry_pricing_profiles` :
```
industry_slug, industry_name, avg_contract_value_cents,
estimated_margin_percent, avg_close_rate, base_rdv_price_cents,
min_rdv_price_cents, max_rdv_price_cents, seasonality_factor
```

`territory_clusters` :
```
cluster_slug, cluster_name, population, competition_score,
demand_score, average_income, housing_density, territory_multiplier
```

Seed initial :
- Industries : isolation (4 200 $, base 145), toiture (12 000, 320), pavage (8 500, 240), paysagement (3 500, 110), électricien (900, 55), peinture (4 500, 90), plomberie (8 500, 150), excavation (15 000, 380), lavage de vitres (450, 35), rénovation (15 000, 350), chauffage (9 500, 180).
- Territoires : montreal-centre (1.35), laval (1.15), rive-sud (1.10), rive-nord (1.08), quebec-ville (1.05), regions-eloignees (0.82), default (1.00).

RLS : lecture publique (read-only), écriture admin via `has_role('admin')`.

### Service `src/services/appointmentPriceEngine.ts`

```ts
computeRdvPrice({ industrySlug, citySlug, season? }): {
  unitPrice, avgContractValue, avgCloseRate,
  industryName, territoryName, multiplier, breakdown[]
}
```

Formule :
```
base = industry.base_rdv_price
unit = clamp(
  base * territory.multiplier * seasonalityMultiplier,
  industry.min_rdv_price, industry.max_rdv_price
)
```

Hook `useAppointmentPriceEngine(industrySlug, citySlug)` avec cache React Query + fallback sur `default` si la combo n'existe pas.

### Packs + rabais volume

Conserver tailles 5 / 10 / 25 / 50 avec rabais 0 / -10 / -18 / -25 %.
`computePackTiers(unitPrice)` retourne `{ size, unitPrice, total, savingsPercent }` calculés dynamiquement par industrie/cluster.

## 3. UI/UX premium

`PanelLeadPackSelector` (et équivalents add-on dans `CardPlanRegular`) :
- Header : `Besoin de plus de rendez-vous qualifiés ?`
- Chaque tier : `10 rendez-vous` gros, `≈ 130 $ / rendez-vous qualifié -10%` en sous-ligne, total à droite formaté `1 300 $`.
- Footer crédibilité : `Calculé selon votre industrie (Toiture), votre région (Montréal) et la valeur moyenne des contrats (≈ 12 000 $).`
- Estimateur ROI sous chaque pack sélectionné :
  ```
  10 rendez-vous · ≈ 4 contrats signés · ≈ 16 800 $ de revenus potentiels
  ```
  (`appointments * avgCloseRate * avgContractValue`).

Animation reveal (300-600 ms staggered) avant affichage du prix :
- `Analyse du marché local…`
- `Calcul du potentiel de revenus…`
- `Optimisation du coût d'acquisition…`
Puis fade-in du prix. Composant `PriceRevealStepper` réutilisable, désactivable (prefers-reduced-motion).

## 4. Plans (texte UX)

Reformuler les 5 cartes plans (`CardPlanRegular`) avec les copies fournies :
- `X rendez-vous qualifiés inclus / mois` mis en avant (typo plus grosse que le prix mensuel).
- Add-ons par plan avec tarifs dynamiques (Recrue +3/+5, Pro +5/+10, Premium +10/+20, Élite +15/+30, Signature +25/+50).
- Bannir « opportunités » / « leads ».
- Micro-copy : `Vous contrôlez votre capacité mensuelle.` + `1 contrat peut rentabiliser plusieurs mois du forfait.`

## 5. Out of scope

- Modifications Stripe / checkout flow (uniquement display + payload `extraAppointments`).
- Vraies données concurrentielles temps réel (utiliser seeds initiaux).
- Refonte du dashboard admin pricing (juste afficher les nouvelles tables en lecture).

## 6. Détails techniques

Fichiers créés :
- `src/lib/formatPrice.ts`
- `src/services/appointmentPriceEngine.ts`
- `src/hooks/useAppointmentPriceEngine.ts`
- `src/components/voice-sales/PriceRevealStepper.tsx`
- migration Supabase (2 tables + seeds + RLS).

Fichiers modifiés :
- `src/lib/appointmentPricing.ts` (utilise le nouveau engine + format)
- `src/config/contractorPlans.ts` (formatPrice canonique)
- `src/components/voice-sales/PanelLeadPackSelector.tsx`
- `src/components/voice-sales/CardPlanRegular.tsx`
- `src/components/voice-sales/CardPlanFounders.tsx`
- `src/pages/voice-sales/PageContractorPlanOnboarding.tsx`
- éventuels écrans checkout qui affichent encore `k$`.

Critères de succès :
- Aucun `k$` visible dans l'app.
- Couvreur à Montréal voit `≈ 432 $ / rendez-vous qualifié`, électricien en région éloignée voit `≈ 45 $`.
- ROI affiché sous chaque pack.
- Animation reveal présente avant le prix.
- Tous les copies « rendez-vous qualifiés inclus / mois » respectées.

Prêt à implémenter sur approbation.