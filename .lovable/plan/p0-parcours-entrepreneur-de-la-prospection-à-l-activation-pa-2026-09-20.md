# P0 — Parcours entrepreneur : de la prospection à l'activation payée

Périmètre de ce plan : **uniquement le P0 (Golden Path entrepreneur)**, comme demandé dans l'ordre d'exécution. Les affiliés (P1) et Clara universelle (P2) suivront dans des plans séparés, une fois le P0 prouvé de bout en bout.

## Ce que l'audit montre déjà

- Le parcours existe **plusieurs fois** : une entrée `/entrepreneur/onboarding`, une série d'écrans `/n/*` (import, analyse, plan, paiement, succès), et une série d'écrans « activation » (landing, compte, import, score, checklist, calendrier, plan, paiement, succès). Il y a aussi plus de 20 fonctions de paiement (`create-checkout-session`, `activation-create-checkout`, `create-contractor-checkout`, `pricing-create-checkout`…).
- Le webhook de paiement (`stripe-webhook`) contient déjà une activation complète et idempotente : création de l'entreprise, du profil, du forfait, statut « activated », attribution de la campagne.
- Le reste (état exact du préremplissage, du plan personnalisé, de l'attribution affiliée dans les metadata, de la cohérence des événements) **n'a pas encore été vérifié** : c'est la première étape du travail ci-dessous, pas une conclusion.

## Étape 1 — Choisir un seul chemin et le déclarer canonique

Un seul parcours est conservé et corrigé :

```text
lien SMS (/entrepreneur/onboarding?...)
  → reconnaissance de l'entreprise (préremplie)
  → confirmation / correction du profil
  → objectifs
  → services (Prioritaire / Accepté / Non recherché)
  → plan personnalisé
  → paiement
  → activation confirmée par Stripe
  → tableau de bord entrepreneur
```

Tous les autres points d'entrée (`/n/*`, écrans d'activation en double, pages de plans génériques) deviennent des redirections vers ce chemin. Aucune page n'est supprimée sans redirection, aucun nouveau parcours n'est créé.
Une seule fonction de paiement et une seule fonction d'activation sont retenues ; les autres restent en place mais ne sont plus appelées par ce parcours.

## Étape 2 — Vérifier chaque maillon avec un vrai prospect de test

Pour chaque étape, on ouvre réellement la page avec un prospect existant en base et on note ce qui marche / ce qui casse :

1. Le lien SMS conserve prospect, entreprise, campagne, ville, service et **code affilié** jusqu'au paiement.
2. La page d'arrivée affiche ce qu'UNPRO sait déjà (nom, logo, ville, services, zones, Google, licences) avec la provenance visible : Vérifié / Déclaré / Inféré / À confirmer. Rien d'inventé : un champ absent reste absent.
3. Le profil est pré-rempli ; l'entrepreneur corrige au lieu de retaper.
4. Les services proposés viennent du métier réel de l'entreprise (jamais de catégories hors sujet).
5. Le plan affiche l'objectif, les territoires, les projets recherchés, le nombre de rendez-vous et le prix — calculés côté serveur à partir des réponses, jamais une grille générique. Une gratuité n'apparaît que si elle est réellement applicable.

## Étape 3 — Paiement et activation

- Le bouton « Activer mon plan » crée une vraie session Stripe en **mode test**, avec la bonne entreprise, le bon forfait, le bon montant et l'attribution affiliée dans les données de la session.
- L'activation dépend **uniquement** de l'événement Stripe confirmé, jamais du retour sur la page de succès.
- Rejouer deux fois le même événement ne doit créer ni double compte, ni double forfait, ni double commission.
- Après activation : compte, profil, forfait, territoires, capacité, disponibilité et statut de visibilité sont à jour. Si une exigence manque (ex. disponibilités), l'écran dit exactement laquelle au lieu d'un statut vague.

## Étape 4 — Mesure du tunnel

Les étapes sont journalisées dans le système d'événements déjà utilisé (aucun second système d'analytique) : prospect enrichi, SMS envoyé, lien ouvert, onboarding démarré, profil confirmé, objectifs complétés, plan généré, plan vu, paiement démarré, paiement confirmé, activation terminée, calendrier connecté, prêt pour les rendez-vous.
Une vue d'administration existante est complétée pour lire le tunnel d'un coup d'œil et voir les dernières erreurs réelles.

## Étape 5 — Test de bout en bout et mobile

Un test complet est exécuté avec un prospect réel de test, en mode Stripe test, sur mobile 390 px : lien → arrivée → profil → objectifs → services → plan → paiement → activation → tableau de bord, y compris une reprise après interruption.
On répare jusqu'à réussite, ou on identifie précisément le blocage externe restant.

## Détails techniques

- Chemin canonique : `/entrepreneur/onboarding` (avec repli formulaire), puis plan personnalisé calculé par la fonction de devis existante, puis checkout via la fonction de paiement déjà branchée sur `stripe-webhook`.
- `stripe-webhook` reste la seule autorité d'activation payée ; `activate_contractor_unified` reste la procédure d'activation.
- Attribution affiliée transportée par l'URL puis recopiée dans les metadata de la session Stripe, et relue par le webhook.
- Aucune table nouvelle sans preuve qu'aucune table actuelle ne convient ; aucune migration destructive.
- Stripe reste en mode test ; aucun envoi automatique de SMS ou de courriel pendant les tests.

## Hors périmètre de ce plan

Moteur de prospects affiliés (P1) et unification complète de Clara texte/voix (P2) : plans séparés, après validation du P0.
