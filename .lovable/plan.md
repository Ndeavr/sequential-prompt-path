# Fix — Libellé "Annuel" affiché même pour l'abonnement mensuel

## Diagnostic confirmé

Le montant transmis est correct : `599 $ CAD par mois` (price ID mensuel). Ce qui est faux, c'est le **titre** affiché par Stripe Checkout : "UNPRO Plan Premium — Annuel".

Cause racine côté Stripe (pas côté code) :
- Le price mensuel `price_1TJf6mCvZwK1QnPV9GWx7OEM` ($599/mois) et le price annuel `price_1TaZJtCvZwK1QnPV4573PwZm` ($6 110/an) sont **tous deux rattachés au même produit Stripe** `prod_UI9uGUb5D4nGUd` dont le nom est figé sur **"UNPRO Plan Premium — Annuel"** avec description "Plan Premium UNPRO — Abonnement annuel".

Stripe Checkout affiche toujours le nom du produit en titre ; l'interval (`par mois` / `par an`) vient du price. D'où le mismatch visuel.

Probablement le même schéma pour les 4 autres plans (Recrue / Pro / Élite / Signature) — à vérifier puis corriger en masse.

## Correctif

### 1. Audit Stripe (préalable)

Récupérer le produit lié à chaque price mensuel et annuel des 5 plans pour confirmer la liste exacte des produits à renommer.

### 2. Renommer les produits Stripe (neutre, sans Mensuel/Annuel)

Mettre à jour chaque produit Stripe partagé monthly+yearly avec un nom et une description neutres :

| code      | name                  | description                            |
|-----------|-----------------------|----------------------------------------|
| recrue    | UNPRO Plan Recrue     | Plan Recrue UNPRO                      |
| pro       | UNPRO Plan Pro        | Plan Pro UNPRO                         |
| premium   | UNPRO Plan Premium    | Plan Premium UNPRO                     |
| elite     | UNPRO Plan Élite      | Plan Élite UNPRO                       |
| signature | UNPRO Plan Signature  | Plan Signature UNPRO                   |

Exécuté via `stripe_api_execute` (PATCH `/v1/products/{id}` `name=…&description=…`).

Résultat attendu côté Checkout :
- Mensuel → "S'abonner à UNPRO Plan Premium" · "599,00 $ CA par mois"
- Annuel  → "S'abonner à UNPRO Plan Premium" · "6 110,00 $ CA par an"

### 3. (Optionnel, plus tard) Séparation propre des produits

À terme, créer un produit Stripe distinct par couple plan×interval (`UNPRO Plan Premium · Mensuel` et `UNPRO Plan Premium · Annuel`) pour clarifier la résiliation et le reporting. Hors scope de ce fix immédiat.

## Hors scope

- Aucun changement de prix.
- Aucun changement de logique d'edge function `create-checkout-session` (déjà correcte : sélection du bon price_id selon `billingInterval`).
- Aucun changement de `plan_catalog` (price IDs inchangés).
- Aucun changement UI front.
