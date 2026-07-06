## Objectif

Sur les écrans finaux du wizard `/scan-ia/wizard` (Step10 Projection + StepActivate), afficher **clairement le plan recommandé** et permettre en un tap un **upsell** (Élite/Signature) ou un **downgrade** (Recrue/Pro) — avec prix mensuel + total taxes incluses mis à jour instantanément. Corriger aussi la barre « Aujourd'hui » qui coupe le chiffre `1`.

Aucun changement à Stripe, aux edge functions ni au flow d'activation (le slug de plan sélectionné est déjà transmis via `recommended_plan` à `scan-ia-activate`).

## Changements

### 1. `src/features/scanIA/growthPlanEngine.ts`
- Étendre `RecommendedPlanSlug` à `"recrue" | "pro" | "premium" | "elite" | "signature"`.
- Étendre `pickRecommendedPlan(opp)` :
  - ≥ 1 000 000 → `signature`
  - ≥ 500 000 → `elite`
  - ≥ 200 000 → `premium`
  - ≥ 100 000 → `pro`
  - sinon → `recrue`

### 2. `src/pages/scan-ia/wizard/useScanWizardState.ts`
- Ajouter `selectedPlan: ContractorPlanSlug | null` + `setSelectedPlan(slug)`.
- Initialisé à `null` (fallback = plan recommandé calculé).

### 3. Nouveau composant `src/pages/scan-ia/wizard/PlanChoiceStrip.tsx`
Strip horizontal scrollable (mobile-first) présentant les 5 plans standards :

```
[ Recrue 149$ ] [ Pro 349$ ] [• Premium 599$ recommandé •] [ Élite 999$ ↑ ] [ Signature 1799$ ↑ ]
```

- Plan recommandé : bordure `amber-400`, badge « Recommandé ».
- Plans inférieurs : label « Économiser » discret.
- Plans supérieurs : label « Plus de capacité » avec flèche ↑.
- Plan sélectionné : fond blanc, bordure `amber-400` renforcée + check.
- Chaque pill affiche : nom · prix HT/mois · appointmentsIncluded.
- Tap → `setSelectedPlan(slug)` (haptic léger).
- Utilise `CONTRACTOR_PLANS` de `src/config/contractorPlans.ts`.
- Ancré en bas de la carte activation, largeur pleine, `overflow-x-auto snap-x`.

### 4. `src/pages/scan-ia/wizard/StepActivate.tsx`
- Remplacer `planSlug = pickRecommendedPlan(...)` par :
  ```ts
  const recommendedSlug = pickRecommendedPlan(...);
  const planSlug = selectedPlan ?? recommendedSlug;
  ```
- Injecter `<PlanChoiceStrip recommended={recommendedSlug} selected={planSlug} onSelect={setSelectedPlan} />` sous la liste des features.
- Le bloc « Après l'essai » (déjà ajouté) reste — recalcule automatiquement via `getPlanPricingBreakdown(planSlug)`.
- Si `planSlug !== recommendedSlug` :
  - downgrade → petite ligne `text-black/50` : « Vous choisissez un plan plus léger — capacité réduite. »
  - upsell → ligne `text-emerald-700` : « Capacité étendue — vous captez plus d'opportunités. »
- Le CTA passe `recommended_plan: planSlug` (déjà le cas).

### 5. `src/pages/scan-ia/wizard/Step10Projection.tsx` (fix + indication plan)
- **Fix bar readability** : si `todayW < 15%`, afficher le chiffre à droite en dehors de la barre (`ml-2 text-white`) au lieu de dans la barre.
- Forcer une largeur minimum visuelle de 44 px (`min-w-[44px]`) sur la barre pour que le chiffre reste lisible.
- Ajouter sous « +N projets additionnels » un mini badge :
  ```
  Plan recommandé : Premium — 599 $/mois
  ```
  cliquable qui scrolle vers l'écran d'activation (déjà l'étape suivante, donc simple `next()`).

### 6. Aucun changement DB / edge / Stripe
- `scan-ia-activate` reçoit déjà `recommended_plan` et mappe au bon prix Stripe. Vérifier rapidement que les 5 slugs (`recrue`, `pro`, `premium`, `elite`, `signature`) sont bien tous supportés côté edge. Si `elite`/`signature` ne sont pas dans le mapping Stripe, ajouter les Price IDs correspondants (ou fallback safe sur `premium` avec log warning).

## Fichiers touchés
- `src/features/scanIA/growthPlanEngine.ts` (extension enum + seuils)
- `src/pages/scan-ia/wizard/useScanWizardState.ts` (état sélection)
- `src/pages/scan-ia/wizard/PlanChoiceStrip.tsx` (nouveau, ~90 lignes)
- `src/pages/scan-ia/wizard/StepActivate.tsx` (intégration + copy contextuelle)
- `src/pages/scan-ia/wizard/Step10Projection.tsx` (fix chiffre + badge plan)
- `supabase/functions/scan-ia-activate/index.ts` (vérif mapping 5 plans — ajout si manquant)

## Critères de succès
- Le chiffre `1` de la barre « Aujourd'hui » est toujours lisible même à faible largeur.
- Step10 affiche le nom du plan recommandé + prix mensuel.
- StepActivate affiche 5 plans en strip, plan recommandé pré-sélectionné et visuellement distinct.
- Tap sur un autre plan → prix, taxes, total et badge « Après l'essai » se mettent à jour instantanément.
- L'activation Stripe utilise bien le plan sélectionné (pas juste le recommandé).
- Aucun impact sur les autres écrans du wizard ni sur les autres flows checkout de l'app.
