# Code promo NICK — activation production à 0 $

Objectif : un entrepreneur qui entre le code **NICK** obtient un compte UNPRO **de production normal**, avec son forfait réellement actif, à 0 $. Aucune notion de test, démo ou essai.

## Ce que la vérification a montré

- Le système de codes promo existe déjà (`promo_codes`, `promo_code_redemptions`, validation serveur, réservation atomique). **Le code NICK n'existe pas encore.**
- Un chemin « 100 % de rabais » existe déjà dans la fonction d'abonnement, mais **il est cassé** : il écrit deux colonnes qui n'existent pas sur la table des entrepreneurs (`status`, `subscription_plan`). L'écriture échoue et l'erreur n'est pas vérifiée → la fonction répond « Plan activé gratuitement ! » alors que **rien n'est activé**. C'est la cause racine à corriger.
- Ce même chemin n'écrit ni journal d'activation, ni audit de paiement, ni client/abonnement Stripe de référence.
- Les fonctions d'enrichissement d'entreprise et de score IA existent déjà et seront réutilisées telles quelles (aucun nouveau système).

## Plan

### 1. Créer le code NICK (données, pas de nouveau système)
- Insérer `NICK` dans le catalogue de codes existant : rabais 100 %, durée « pour toujours » sur le forfait choisi, applicable à tous les forfaits payants actifs, mensuel et annuel, actif, non archivé, non « interne seulement ».
- Libellé public : « Forfait entièrement offert grâce au code NICK ».
- Aucun champ « test ». Aucune suppression d'autres codes.

### 2. Réparer l'activation à 0 $ (le vrai correctif)
Dans la fonction d'abonnement, remplacer la branche cassée par une activation complète et **idempotente** :
- écrire les vraies colonnes de statut de l'entrepreneur (compte actif, activation complétée) et **vérifier l'erreur** — plus jamais de faux succès ;
- créer/mettre à jour l'abonnement de l'entrepreneur : forfait, intervalle, statut actif, période courante, prix d'origine, prix final 0, code promo, 100 % ;
- inscrire l'activation au journal d'activation et à l'audit de paiement existants ;
- marquer la réservation du code comme consommée ;
- créer le client Stripe et l'abonnement Stripe à 0 $ **si** cela reste possible sans demander de carte ; sinon, consigner clairement l'absence de référence Stripe plutôt que d'inventer une valeur ;
- rejouer la même requête (rafraîchissement, double clic, retour webhook) ne crée **aucun** doublon : entrepreneur, abonnement, réservation et audit sont réutilisés.

### 3. Événement d'audit
Émettre `contractor_plan_activated_with_promo` avec : entrepreneur, entreprise, forfait, prix d'origine, prix final, code NICK, horodatage. Jamais étiqueté comme activation de test.

### 4. Paiement — écran
Quand NICK est appliqué :
- bandeau « ✓ Code NICK appliqué » ;
- prix d'origine barré, **0 $** affiché comme montant dû aujourd'hui (taxes à 0) ;
- texte : « Votre forfait est entièrement offert grâce au code NICK. » ;
- le champ de carte Stripe est masqué et remplacé par le bouton **« Activer mon forfait »** ;
- après succès : redirection vers le tableau de bord entrepreneur de production.
Aucun mot « test », « démo », « essai », « sandbox », « gratuit temporaire ».

### 5. Profil réel et score IA (réutilisation)
- À l'entrée du nom d'entreprise / téléphone / site, déclencher l'enrichissement existant pour préremplir : nom officiel, logo, site, téléphone, courriel, adresse, territoires, services, description, heures, note et avis Google, RBQ/NEQ, photos, réseaux sociaux.
- Chaque champ conserve son statut interne : **Vérifié / Déclaré / Inféré / En attente**. Rien n'est inventé.
- Logo réel utilisé s'il est trouvé de façon fiable ; sinon, téléversement facile. Pas de logo générique quand un vrai logo existe.
- Le score IA est calculé par UNPRO à partir des données réelles ; jamais saisi par l'entrepreneur. Les facteurs principaux et les améliorations suggérées sont affichés.
- Un échec d'enrichissement n'empêche jamais l'inscription : on continue avec ce qui est connu.

### 6. Clara
Clara lit l'état réel du compte : entrepreneur réel, forfait actif, compte de production, prix couvert par NICK. Elle ne renvoie jamais vers un paiement pour cette même activation. Elle ne pose que les questions dont la réponse manque encore (services, territoire, disponibilités, logo, préférences de rendez-vous, objectifs) et propose la prochaine meilleure action.

### 7. Jumelage
Aucun traitement particulier : un compte activé avec NICK entre dans le jumelage selon les mêmes règles réelles (compatibilité, territoire, disponibilité, budget, services, conformité, performance). Ni bonus ni pénalité liés au code.

### 8. Erreurs couvertes
Code invalide, expiré ou désactivé, limite atteinte, double paiement, compte déjà actif, rejeu de webhook, rafraîchissement pendant l'activation, enrichissement indisponible. Chaque cas affiche un message clair en français et ne crée aucun doublon.

## Vérification
- Parcours complet en production avec un vrai entrepreneur : inscription → identification d'entreprise → préremplissage réel → score IA → Clara → choix du forfait → NICK → 0 $ → activation → tableau de bord → droits du forfait débloqués → jumelage éligible.
- Contrôle en base après activation : abonnement actif, journal, audit, réservation consommée, aucun doublon, aucun marqueur de test.
- Non-régression : un entrepreneur **sans** NICK suit exactement le parcours payant actuel (carte, taxes, montant réel).
- Tests automatisés ajoutés pour : rabais 100 % activant réellement, rejeu idempotent, code invalide/expiré, parcours payant intact.
- Exécution des tests, de la vérification de types et de la construction.

## Détails techniques
- Données : insertion de `NICK` dans `promo_codes` (aucune migration de schéma requise).
- Fonction corrigée : `supabase/functions/create-subscription-intent/index.ts` (branche `discount_value >= 100`) — écriture sur `contractors.account_status` / `activation_status`, upsert `contractor_subscriptions`, insertion `contractor_activation_ledger` + `unpro_payment_activation_audit` + `contractor_activation_events`, consommation de `promo_code_redemptions`, gestion explicite des erreurs Supabase.
- Même correctif appliqué à la branche zéro-total équivalente de `create-checkout-session` pour éviter deux comportements divergents.
- UI : `src/pages/checkout/PageCheckoutNativeScrollable.tsx` (état 100 %, masquage du Payment Element, CTA « Activer mon forfait ») et `src/hooks/useCheckoutPricing.ts` pour le total à 0.
- Enrichissement : réutilisation de `contractor-activation-enrich` / `enrich-business-profile` / `aipp-real-scan`. Aucune nouvelle fonction d'enrichissement.
- Stripe reste en mode réel ; aucun basculement en mode test, aucun nouveau produit/prix.
