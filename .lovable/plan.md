# Forfaits Propriétaires — Gratuit / Plus / Gold

Objectif : rendre les forfaits propriétaires immédiatement compréhensibles ET réellement appliqués côté serveur. On étend l'existant, aucun système parallèle.

## Ce qui existe déjà (audit effectué)

- Route `/pricing/proprietaires` → `PricingHomeownersPage` → `HomeownerPlans` (aussi `/tarifs`, `/tarifs/proprietaires`).
- Catalogue autoritaire en base : `plans` (audience `homeowner`) + `plan_features`, lus par `useHomeownerPlan`.
  - `home_decouverte` 0 $, `home_plus` 49 $/an (`price_1TJflu…`), `home_signature` 149 $/an (`price_1TJflv…`).
  - Limites actuelles : propriétés 1 / 3 / 5 ; analyses/mois 1 / illimité / illimité ; aucune règle designs IA.
- Checkout + portail : `create-homeowner-checkout`, `verify-homeowner-payment`, webhook `stripe-webhook` → `homeowner_subscriptions`.
- Gating UI : `HomeownerLockedFeature`, page `/upgrade`.

Problèmes constatés :
1. `HomeownerPlans` affiche des listes de features **codées en dur** qui contredisent la base (ex. « jusqu'à 3 adresses » sur Plus).
2. Les limites ne sont **pas appliquées** : `useProperties` et `OnboardingPageUnpro` insèrent une propriété sans vérification.
3. Les analyses de soumissions (`analyze-quote-comparative` → `quote_analyses`) ne consultent aucun quota.
4. Les designs IA (`design-generate`) utilisent une limite de 3 en dur + un appel Stripe direct, hors catalogue.
5. Le quota de générations existant (`user_generation_usage`, `check_generation_quota`) est **à vie**, pas mensuel, et dérive du plan **entrepreneur**. Inutilisable tel quel pour les propriétaires.

## Décisions retenues

- Libellés affichés : **Gratuit / Plus / Gold**. Codes techniques et prix Stripe inchangés (`home_signature` = Gold).
- Aucune donnée supprimée. Au-delà de la limite, les propriétés excédentaires passent en **lecture seule (inactives)**, avec choix de la propriété active et réactivation par upgrade.
- Designs IA : Gold illimité (usage normal), **Plus conserve une limite mensuelle**. Valeur proposée : **10 designs/mois** (aucune limite propriétaire n'existait ; à confirmer ou ajuster, signalée dans le rapport final).

## Grille finale

| | Gratuit | Plus | Gold |
|---|---|---|---|
| Prix | 0 $ | 49 $/an | 149 $/an |
| Propriétés | 1 | 1 | 3 |
| Analyses de soumissions | 1/mois (jusqu'à 3 soumissions par analyse) | illimité* | illimité* |
| Designs IA | 1/mois | 10/mois | illimité* |
| Passeport Maison | 1 | complet | 1 par propriété |

`* Illimité pour une utilisation personnelle normale.`

## Ce qui sera construit

### 1. Catalogue (base de données, source unique)
- Mise à jour de `plans.name` → Gratuit / Plus / Gold + nouvelles taglines (« Découvrez l'intelligence UNPRO », « Ma maison, sans limites », « Toutes mes propriétés, sans limites »).
- Mise à jour `plan_features` : `properties_max` 1/1/3, `quote_analysis_monthly` 1/-1/-1, `quote_comparison` 3/3/3 (activé aussi sur Gratuit), nouvelle clé `ai_design_monthly` 1/10/-1.
- Textes de teaser/upgrade corrigés pour correspondre aux nouvelles règles.

### 2. Compteurs serveur (structure minimale)
- Nouvelle table `homeowner_usage_monthly (user_id, period_month, feature_key, used_count, updated_at)` avec unicité `(user_id, period_month, feature_key)`, RLS lecture propriétaire uniquement, écriture service_role.
- Fonction SECURITY DEFINER `homeowner_consume_quota(_user_id, _feature_key, _idempotency_key)` :
  - résout le plan actif via `homeowner_subscriptions` + `plan_features` ;
  - refuse si la limite est atteinte (retourne un motif + plan cible d'upgrade) ;
  - incrémente atomiquement, avec clé d'idempotence pour éviter les doubles clics / retries ;
  - `-1` = illimité (aucun décompte bloquant).
- Fonction `homeowner_can_add_property(_user_id)` → compte les propriétés **actives** vs `properties_max`.
- Le décompte n'a lieu qu'**après succès réel** de l'opération.

### 3. Application des règles
- `analyze-quote-comparative` : consomme `quote_analysis_monthly` une seule fois par session d'analyse (1 à 3 soumissions = 1 analyse), après la persistance réussie dans `quote_analyses`. Refus explicite si quota atteint.
- `design-generate` : remplace la limite en dur de 3 et l'appel Stripe direct par `ai_design_monthly` via le catalogue propriétaire.
- Création de propriété (`useProperties`, `OnboardingPageUnpro`) : garde côté serveur via une fonction/edge dédiée + garde UI ; message clair au lieu d'un échec brut.
- Colonne `is_active` sur les propriétés (ou réutilisation d'un champ existant équivalent) pour la lecture seule au-delà de la limite ; jamais de suppression.

### 4. Expérience de limite atteinte
Composant réutilisable (basé sur `HomeownerLockedFeature`) :
- Analyse : « Votre analyse gratuite du mois a été utilisée. » → CTA « Passer à Plus ».
- 2ᵉ propriété : « Votre forfait actuel comprend 1 propriété. » → CTA « Voir Gold ».
- 4ᵉ propriété Gold : « Gold comprend jusqu'à 3 propriétés. » → sans CTA d'upgrade.
- Design : « Votre design du mois a été utilisé. » → CTA adapté au plan.

### 5. Page `/pricing/proprietaires`
- Les trois cartes lisent le catalogue en base (fin des listes codées en dur).
- Hiérarchie mobile-first : nom, positionnement en une ligne, prix, 4 points maximum, CTA. Plus reste le choix recommandé.
- Note sous les plans : `* Illimité pour une utilisation personnelle normale.`
- Mention dans les conditions : limitation possible des usages automatisés, excessifs, commerciaux ou abusifs.
- Le sélecteur de propriété active (mobile) est ajouté au compte propriétaire.

### 6. Stripe et cycle d'abonnement
- Aucun nouveau produit. Vérification que les Price IDs correspondent aux montants affichés.
- Test réel du parcours : Gratuit → Plus, Gratuit → Gold, Plus → Gold, Gold → Plus, annulation, échec de paiement, retour Stripe, webhook, mise à jour `homeowner_subscriptions`, droits recalculés.
- Downgrade Gold → Plus avec plusieurs propriétés : aucune suppression, écran de choix de la propriété active, le reste conservé et réactivable.

### 7. Sécurité
- Vérification des RLS existantes sur propriétés, analyses, soumissions, designs, Passeport avant toute modification ; correction si une fuite inter-utilisateurs est détectée.
- Aucune clé secrète exposée au frontend.

### 8. Anti-abus — reporté
Aucun tableau de bord. Les compteurs mensuels et les journaux suffisent pour une détection ultérieure. Un `TODO: Future Admin: Fair Usage Monitoring` est ajouté au bon endroit.

## Tests
- Gratuit : 1ʳᵉ propriété OK, 2ᵉ bloquée avec CTA Gold ; 1ʳᵉ analyse OK (3 soumissions = 1 analyse), 2ᵉ bloquée avec CTA Plus ; 1ᵉʳ design OK, 2ᵉ bloqué.
- Plus : 1 propriété OK, 2ᵉ propose Gold, analyses multiples OK, aucune limite visible sur les analyses.
- Gold : propriétés 1-2-3 OK, 4ᵉ bloquée proprement, analyses et designs multiples OK.
- Double clic / refresh ne consomme pas deux crédits (idempotence).
- Vérification visuelle mobile et desktop de la page pricing et des écrans de limite.

## Critères de complétion
Les 15 critères de la demande, vérifiés sur données de production réelles, avec un rapport final listant : prix Stripe confirmés, limites réellement appliquées, valeur retenue pour les designs Plus, et tout blocage externe éventuel.
