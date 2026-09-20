# P0 — Réparer l'activation affiliée + lisibilité du logo

## Cause racine vérifiée (lecture code + base)

1. **Activation cassée.** `affiliate-onboarding-activate` termine par un enregistrement de la fiche affiliée avec « en cas de conflit sur le compte utilisateur, mettre à jour ». Or l'unicité sur le compte utilisateur est posée par un index **partiel** (`affiliates_user_id_unique … WHERE user_id IS NOT NULL`). Postgres refuse ce type de conflit sur un index partiel → erreur → réponse 500 → le bouton affiche « Edge Function returned a non-2xx status code ». C'est le blocage exact de l'étape 4/4.
2. **Acceptation des conditions jamais enregistrée.** La table `partner_terms_acceptance` n'a aucune contrainte d'unicité sur (partenaire, rôle, version) ; l'écriture échoue silencieusement (erreur non vérifiée). Preuve d'acceptation absente = risque de conformité.
3. **Aucune trace.** La fonction n'écrit aucun journal d'erreur : les journaux ne montrent que des démarrages. Impossible de diagnostiquer à distance.
4. **Logo invisible.** `/affilies` et `/affilies/onboarding` sont en fond crème (`landing-warm`) mais demandent le logo en mode « automatique », qui suit le thème de l'application : en thème sombre, c'est le mot-symbole **blanc** qui est servi sur fond crème → « UNPRO » disparaît.
5. Ce qui fonctionne déjà et ne sera pas refait : l'onboarding 4 étapes, la reprise de brouillon, la récupération d'une fiche pré-créée par l'admin, la redirection `/affiliate`, et l'écran Mode Action qui possède déjà un état vide réel (« Aucun prospect à contacter maintenant. Ajoutez-en un pour continuer. »).

## Correctifs

### P0.1 — Activation (migration + fonction)
- Migration non destructive : remplacer l'index partiel par une contrainte d'unicité réelle sur le compte utilisateur de la fiche affiliée, et ajouter l'unicité manquante (partenaire, rôle, version) sur l'acceptation des conditions. Aucune suppression de données ; vérification préalable des doublons éventuels, traités avant création de la contrainte.
- Fonction : vérifier l'erreur de l'écriture des conditions et du rôle au lieu de l'ignorer, journaliser chaque échec avec un identifiant de corrélation, et renvoyer des codes d'erreur stables.

### P0.2 — Aucun message technique à l'écran
- À l'étape 4/4, traduire les codes serveur en français clair (« Votre session a expiré, vérifiez à nouveau votre numéro. », « Vous devez accepter les conditions. », « Activation impossible pour le moment — réessayez. ») et ne jamais afficher le texte brut renvoyé par le serveur.
- Bouton : état chargement, blocage du double clic, et action « Réessayer » qui relance la même activation (déjà idempotente).

### P0.3 — Logo lisible partout
- Règle unique : fond clair → lockup bleu/navy ; fond sombre → lockup blanc. Appliquer explicitement le ton clair sur `/affilies`, `/affilies/onboarding`, connexion affiliée et l'espace affilié (vérifier chaque en-tête), plutôt que de laisser le mode automatique décider.

### P1 — Parcours
- Étapes 2 et 3 : vérifier retour arrière et reprise après interruption (brouillon local déjà en place).
- Après activation : arrivée sur un vrai premier prospect ; sinon état vide productif (zone choisie, catégories, compteur, action pour élargir le territoire) — compléter l'état vide existant plutôt qu'en créer un.
- Confirmer que le code/lien personnel est visible dès l'arrivée et que chaque entrepreneur référé est bien rattaché à cette affiliée, commissions comprises.
- Ville : la rendre requise si elle sert à la distribution des prospects (à confirmer avec la logique serveur avant de changer le libellé).

### P2 — Détails
- CTA collant de `/affilies` affiché seulement après que le premier « JE COMMENCE! » soit sorti de l'écran.
- États de chargement et messages d'erreur homogènes.

## Vérification
- Rejouer l'activation de bout en bout : compte réel → étape 4/4 → fiche affiliée créée une seule fois → conditions enregistrées → arrivée sur l'espace affilié.
- Contrôle en base : une seule fiche par compte, code et lien personnels présents, acceptation des conditions présente.
- Contrôle visuel mobile 390 px sur les quatre écrans affiliés (logo lisible).
- Tests ciblés, vérification des types, lint, build.

## Hors périmètre
Aucun envoi automatique de SMS ou courriel, aucun nouveau parcours parallèle, aucune modification Stripe.
