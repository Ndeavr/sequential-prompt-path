

## Problemes identifies

1. **Prix incoherents entre deux sources**: `PlanRecommendationHero.tsx` a ses propres prix hardcodes (Elite = 199$) tandis que `contractorPlans.ts` a Elite = 24900 cents = **249$**. Le checkout lit depuis `contractorPlans.ts`, d'ou le 249$ affiche.

2. **Prix dans contractorPlans.ts ne correspondent pas a la grille officielle**: Selon la grille tarifaire definie (Recrue 0$, Pro 49$, Premium 99$, Elite 199$, Signature 399$), les prix en cents dans `contractorPlans.ts` sont faux:
   - Recrue: 4900 (49$) → devrait etre 0
   - Pro: 9900 (99$) → devrait etre 4900 (49$)
   - Premium: 14900 (149$) → devrait etre 9900 (99$)
   - Elite: 24900 (249$) → devrait etre 19900 (199$)
   - Signature: 49900 (499$) → devrait etre 39900 (399$)

3. **75 RDV/mois absurde**: Le calculateur de revenus peut produire des chiffres irrealistes quand les inputs sont eleves — aucun cap ni validation.

## Plan

### 1. Corriger contractorPlans.ts — source unique de verite
Aligner les prix mensuels et annuels sur la grille officielle:
- Recrue: 0$/mois, 0$/an
- Pro: 4900 cents (49$), annuel ~499$ 
- Premium: 9900 cents (99$), annuel ~999$
- Elite: 19900 cents (199$), annuel ~1999$
- Signature: 39900 cents (399$), annuel ~3999$

### 2. Refactorer PlanRecommendationHero.tsx
Supprimer le `PLANS` hardcode. Importer directement depuis `contractorPlans.ts` via `getPlanById()` et `formatPlanPrice()` pour que les prix soient toujours synchronises.

### 3. Plafonner le calculateur de RDV
Dans `PageAlexGoalsStrategy.tsx`, ajouter un cap raisonnable (ex: max 30 RDV/mois affiches) et un message si le calcul depasse la capacite realiste.

### Fichiers modifies
- `src/config/contractorPlans.ts` — prix corriges
- `src/components/goals/PlanRecommendationHero.tsx` — import depuis config, suppression PLANS hardcode
- `src/pages/goals/PageAlexGoalsStrategy.tsx` — cap sur monthlyAppointments

