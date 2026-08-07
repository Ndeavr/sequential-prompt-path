# Fermer les 7 constats de production

## Ce que la vérification montre déjà (avant tout changement)

Vérifié en base et dans le code cette session :

1. **Prix Pro 299 $ vs 349 $** — `create-checkout-session` lit maintenant `public.plans` (plus `plan_catalog`) et `plans.pro.monthly_price = 29900` avec le prix Stripe `price_1U1eB1…`. Corrigé, à re-tester puis marquer résolu.
2. **Nouveaux plans non achetables** — `plans` contient `presence`, `local`, `croissance`, `pro`, `premium`, `domination`, tous actifs avec un ID de prix Stripe mensuel. Corrigé, à re-tester.
3. **Devis territoriaux** — `compute-pricing-quote` utilise bien `value_multiplier` et n'interroge plus `saturation_band` (la saturation vient de `territory_availability`). Corrigé.
5. **File de sollicitation** — `solicitation-build-queue` lit `website_url` / `review_count`. Corrigé.
7. **Statut « payé » écrasé** — le trigger `trg_monotonic_outreach_status` existe sur `verified_contractor_prospects`. Corrigé.

## Ce qui reste réellement cassé

### A. Sauvegarde des notes CRM (constat 6) — cause racine confirmée
La table `crm_prospect_notes` a bien la sécurité au niveau des lignes et une règle d'accès pour les admins connectés, mais **aucune permission d'accès n'a été accordée** aux rôles applicatifs. Résultat : chaque écriture est refusée avant même d'évaluer la règle. Même situation à vérifier pour `crm_action_log`.

Correctif : une migration qui accorde lecture/écriture aux utilisateurs authentifiés et l'accès complet au rôle de service sur ces deux tables. Aucun changement de logique métier.

### B. Facturation annuelle impossible (écart trouvé pendant l'audit)
Dans `plans`, `stripe_yearly_price_id` est vide pour les six plans. Si l'écran de tarification propose le paiement annuel, `create-checkout-session` renvoie « Price not configured ». Correctif : créer les prix annuels Stripe pour les six plans aux montants déjà en base (490 / 790 / 1490 / 2990 / 5990 / 14990 $) et enregistrer les identifiants dans `plans`.

### C. Découverte Google Places (constat 4) — blocage externe
Le disjoncteur est en place et signale l'état de la source. Les erreurs 502 proviennent du quota Google épuisé côté compte, pas du code. Action de ce run : relancer un appel réel pour capturer le code d'erreur exact et le consigner, puis rapporter soit « corrigé », soit « blocage externe » avec la preuve (le quota ne peut pas être relevé depuis l'application).

## Vérifications exécutées après correctifs

- Créer une session de paiement réelle pour chaque plan actif (`presence` → `domination`) et confirmer le montant exact en CAD côté Stripe.
- Enregistrer une note CRM depuis `/admin/crm` et confirmer la ligne en base.
- Rejouer la réconciliation Twilio sur un prospect marqué payé et confirmer que le statut reste payé.
- Appeler `solicitation-build-queue` en mode simulation et confirmer un pool de prospects non nul.
- Appeler `compute-pricing-quote` sur une ville configurée et confirmer que le multiplicateur territorial n'est plus la valeur par défaut.

## Détails techniques

- Migration : `GRANT` sur `public.crm_prospect_notes` et `public.crm_action_log` (authenticated + service_role).
- Stripe : création des 6 prix annuels via l'API Stripe, puis `UPDATE public.plans SET stripe_yearly_price_id = …`.
- Aucun système parallèle créé, aucune modification des garde-fous anti-doublon de recrutement.
- Chaque constat sera clos via l'outil de suivi avec la mention corrigé / obsolète / faux positif et sa preuve.

## Rapport final attendu

Disposition 7/7, fichiers et fonctions modifiés, tests exécutés, résultat acquisition, résultat paiement, blocages externes, prêt à publier oui/non, prêt pour le premier 1 $ oui/non.
