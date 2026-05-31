## État actuel — le système est déjà construit à 80%

La base existe et fonctionne :
- **Tables** : `contractor_growth_profiles`, `territory_market_scores`, `dynamic_plan_recommendations`, `pricing_engine_coefficients` ✅
- **Edge function** : `api_generate_dynamic_plan` (287 lignes, calcul prix dynamique + reco) ✅
- **UI entrepreneur** : `/entrepreneur/plan-ia` → `PageDynamicPlanGeneration` (intro cinématique + `GrowthProfileWizard` 10 questions + `DynamicPlanReveal`) ✅
- **Admin** : `/admin/dynamic-pricing` → `PageAdminDynamicPricing` (coefficients) ✅

**Ce qui manque** vs. la spec : intégration au funnel, handler Alex "plan sur mesure", admin saturation/territoires, et remplacement des CTA "Choisissez un forfait" dans le reste du parcours.

## Ce qu'on ajoute (5 deltas)

### 1. Brancher AIPP → Plan IA (au lieu de la grille statique)

Dans `PageEntrepreneurDiagnosticLanding.tsx` (ligne 982) : remplacer le `Link to="/entrepreneur/plans"` (grille générique) par `Link to="/entrepreneur/plan-ia"` après que le score AIPP est révélé. Idem dans `ContractorOnboardingLanding` et le CTA post-paiement.

Repositionner le copy CTA : `"Voir mon plan IA personnalisé"` (au lieu de "Choisissez un forfait" / "Voir les forfaits").

### 2. Handler Alex "Plan sur mesure"

Ajouter `custom_plan_consultation` comme mode Alex (`src/config/alexModes.ts` + listener sur `alex:open` dans `AlexVoiceContext`). Alex pose 3-4 questions ouvertes (objectif, exclusivité voulue, contraintes), génère un brouillon via `api_generate_dynamic_plan` avec `override_mode=custom`, puis propose un prix négocié + bouton "Verrouiller ce plan".

Ajouter sur la page principale entrepreneur un bouton tertiaire `Créer mon plan sur mesure` qui déclenche le même évènement (déjà présent dans `DynamicPlanReveal`, à hisser au niveau du parcours).

### 3. Admin Dynamic Pricing — extensions

Étendre `PageAdminDynamicPricing` (177 lignes) avec 3 nouveaux panels lisant le data existant :
- **Saturation marchés** : table `territory_market_scores` ordonnée par `exclusivity_slots_taken/exclusivity_slots_total DESC`, badge rouge si saturé.
- **Métiers sous-desservis** : agrégation `demand_score - competition_score` (gap > 30 → highlight).
- **Override prix manuel** : drawer sur ligne `dynamic_plan_recommendations` permettant d'écrire dans `pricing_overrides` (table existante).

### 4. Rafraîchir UI Reveal (positionnement premium)

`DynamicPlanReveal` : ajouter 3 ScoreRings côte à côte (marché / opportunité / compétition — données déjà retournées par l'edge function dans `recommendation_reason`), badge "Exclusivité partielle disponible" si `exclusivity_level !== 'none'`, et plage de revenus estimés en gros caractères au-dessus du prix.

Garantir le wording exigé :
- Header : "Plan IA optimisé pour votre marché"
- Sous-titre : "Optimisé selon votre métier, territoire et capacité"
- Jamais "Choisissez un forfait" ni "Forfait" comme mot principal.

### 5. Audit + suppression points d'entrée "grille statique"

Recenser via `rg "Choisissez un forfait|/entrepreneur/plans"` les autres entrées qui pointent vers une grille SaaS classique et les rediriger vers `/entrepreneur/plan-ia` (ou les rendre internes/admin uniquement).

## Hors-scope (déjà fait, on ne touche pas)

- Le moteur de calcul (`api_generate_dynamic_plan`) — la formule actuelle est conforme à la spec.
- Les tables de base — schéma déjà aligné.
- Le wizard 10 questions (`GrowthProfileWizard`) — couvre déjà capacité / ticket / équipes / territoires / objectif / exclusivité / services / saison / dispo / qualité-vs-volume.

## Fichiers touchés

- **Édité** : `src/pages/entrepreneur/PageEntrepreneurDiagnosticLanding.tsx` (CTA → plan-ia)
- **Édité** : `src/features/contractorProfile/...ContractorOnboardingLanding.tsx` (CTA)
- **Édité** : `src/features/dynamicPricing/components/DynamicPlanReveal.tsx` (3 ScoreRings + badges + revenue range)
- **Édité** : `src/config/alexModes.ts` + `src/contexts/AlexVoiceContext.tsx` (mode `custom_plan_consultation`)
- **Édité** : `supabase/functions/api_generate_dynamic_plan/index.ts` (paramètre `override_mode`)
- **Édité** : `src/pages/admin/PageAdminDynamicPricing.tsx` (3 panels saturation/sous-desservi/override)
- **Édité** : `mem://index.md` + nouvelle mémoire `mem://pricing/dynamic-plan-ia-flow`

## Critère de succès

Un entrepreneur qui termine son scan AIPP atterrit sur `/entrepreneur/plan-ia`, complète le wizard en 60s, voit son plan personnalisé avec 3 scores marché + plage de revenus + statut exclusivité, et peut soit accepter soit lancer Alex pour un plan sur mesure. L'admin voit en temps réel quels territoires sont saturés et peut overrider un prix.
