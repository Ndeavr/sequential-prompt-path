## Réponse directe à ta question

D'après l'écran actuel (`StepActivate.tsx`) et `contractorPlans.ts` + mémoire pricing UNPRO :

- **Plan recommandé** : sélectionné dynamiquement par `pickRecommendedPlan(opportunité)` dans `src/features/scanIA/growthPlanEngine.ts`. Dans ton cas (ISROYAL.CA, opportunité 48 600 $) → **Premium**.
- **Essai** : **1 $ CAD pour 7 jours**.
- **Après 7 jours (renouvellement mensuel automatique)** selon le plan recommandé :

| Plan | HT / mois | TPS 5 % | TVQ 9,975 % | **Total TTC / mois** |
|---|---:|---:|---:|---:|
| Recrue | 149 $ | 7,45 $ | 14,86 $ | **171,31 $** |
| Pro | 349 $ | 17,45 $ | 34,81 $ | **401,26 $** |
| **Premium** (recommandé ici) | **599 $** | **29,95 $** | **59,75 $** | **688,70 $** |
| Élite | 999 $ | 49,95 $ | 99,65 $ | **1 148,60 $** |
| Signature | 1 799 $ | 89,95 $ | 179,45 $ | **2 068,40 $** |

Actuellement, l'écran d'activation n'affiche **pas** ce prix post-essai — c'est un trou d'information qui nuit à la confiance.

## Plan proposé : rendre le prix post-essai transparent sur `StepActivate`

Zéro nouvelle logique métier, uniquement présentation.

### 1. Ajouter le prix HT + TTC au plan
Dans `src/config/contractorPlans.ts`, chaque plan a déjà `price_monthly`. Ajouter un helper `getPlanPricingBreakdown(slug)` (nouveau fichier `src/features/scanIA/planPricingBreakdown.ts`) qui retourne `{ subtotal, gst, qst, total }` en utilisant les taux QC (5 % + 9,975 %) — cohérent avec `calculate-checkout-pricing`.

### 2. Enrichir la carte d'activation (`StepActivate.tsx`)
Sous le bloc noir « ESSAI ACTIVATION — 1 $ / 7 jours », insérer un petit bloc secondaire :

```
Après l'essai
Premium — 599 $ / mois
+ TPS 29,95 $   + TVQ 59,75 $
Total 688,70 $ / mois taxes incluses
Annulable en 1 clic avant la fin de l'essai.
```

Style : texte fin, `text-black/60`, séparateur `border-t border-black/5`, aucune couleur criarde — reste dans le langage visuel actuel (carte blanche premium).

### 3. Ajouter une 5ᵉ puce dans la liste
Ajouter « Aucun prélèvement avant le jour 8 » à la liste des checks pour clore l'objection.

### 4. Micro-ajustement d'accessibilité
- Mettre le prix post-essai dans un `<p aria-label="Prix après l'essai : 688,70 dollars par mois taxes incluses">` pour lecteurs d'écran.
- Pas de changement au flux Stripe ni à `scan-ia-activate`.

### Fichiers touchés
- `src/features/scanIA/planPricingBreakdown.ts` (nouveau, ~30 lignes)
- `src/pages/scan-ia/wizard/StepActivate.tsx` (ajout ~20 lignes JSX)

### Critères de succès
- L'écran affiche : plan recommandé, prix HT, TPS, TVQ, total TTC/mois, date de premier prélèvement implicite (« après 7 jours »).
- Chiffres identiques à ce que Stripe facturera au renouvellement.
- Aucune régression sur le bouton « Activer maintenant » (redirection Stripe inchangée).

Confirme et je passe en build.
