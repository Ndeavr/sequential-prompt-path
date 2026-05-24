
## Problèmes à corriger

### 1. Fuite UX — "Aucun redirect"
Dans `src/components/pro-landing/InlineCheckoutNuclear.tsx` (ligne 222-224), la phrase `Aucun redirect. Paiement sécurisé Stripe. Annulation en tout temps.` expose un détail de mécanique interne (mémoire UX UNPRO interdit ce type de copie).

**Remplacer par un résumé orienté valeur du plan sélectionné**, par ex. :
> « Plan {Nom} — {tagline}. {N} rendez-vous qualifiés / mois. Activation immédiate. »

Texte généré dynamiquement depuis `activePlan.name`, `activePlan.tagline`, `activePlan.appointmentsIncluded`.

### 2. Montants Stripe annuels désynchronisés

Vérifié via Stripe + DB :

| Plan | DB annuel | Stripe annuel actuel |
|---|---|---|
| Recrue | 1 520 $ | 470 $ |
| Signature | 17 270 $ | 4 790 $ |

Les `stripe_yearly_price_id` dans `plan_catalog` pointent vers d'anciens prix obsolètes. L'utilisateur paie 10× moins que ce qui est affiché → fuite de revenus + risque de litige.

**Correctif** :
1. Créer 5 **nouveaux prix Stripe annuels** correspondant exactement aux montants de la colonne `annual_price` du catalogue (1520, 3560, 6110, 10190, 17270 $ CAD, recurring `year`, sur les produits existants).
2. Mettre à jour `plan_catalog.stripe_yearly_price_id` pour chaque code (`recrue`, `pro`, `premium`, `elite`, `signature`) via migration SQL.
3. (Optionnel) Désactiver les anciens prix Stripe pour éviter toute réutilisation.

Aucun changement sur les prix mensuels (déjà alignés : 149/349/599/999/1799 $).

### Question à confirmer avant exécution
Les montants annuels actuels du catalogue (1520, 3560, 6110, 10190, 17270) ne correspondent pas à un multiple uniforme du mensuel (≈10.2× pour Recrue/Pro/Premium/Elite, ≈9.6× pour Signature). **Confirmer que ces montants annuels DB sont la vérité officielle**, ou fournir la grille annuelle correcte avant que je crée les prix Stripe.

## Étapes d'implémentation

1. **UX** — Éditer `InlineCheckoutNuclear.tsx` : retirer la phrase "Aucun redirect…" et la remplacer par un résumé dynamique du plan (`name` + `tagline` + appointments + "Activation immédiate").
2. **Stripe** — Créer 5 nouveaux prix annuels via `stripe--create_stripe_product_and_price` (réutiliser les `product` existants).
3. **DB** — Migration : `UPDATE plan_catalog SET stripe_yearly_price_id = '...' WHERE code = '...'` pour chacun des 5 plans.
4. **Vérif** — Lancer un checkout annuel sur Recrue et Signature, confirmer que Stripe affiche 1 520 $ et 17 270 $.

## Hors scope
- Pas de refonte du composant checkout
- Pas de modification des prix mensuels ni one-time (Fondateurs)
- Pas de changement à `create-checkout-session` (la fonction lit déjà les bons price IDs depuis le catalogue)
